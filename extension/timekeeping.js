'use strict';

const TimeObject = require('./classes/time-object');
const HEARTBEAT_INTERVAL = 2500;
let interval;
let heartbeatTimeout;
let heartbeatInterval;
let serialReconnectPending = false;

module.exports = function (nodecg) {
	const currentRun = nodecg.Replicant('currentRun');
	const stopwatch = nodecg.Replicant('stopwatch', {
		defaultValue: (function () {
			const to = new TimeObject(0);
			to.state = 'stopped';
			to.results = [null, null, null, null];
			return to;
		})()
	});

	// Load the existing time and start the stopwatch at that.
	if (stopwatch.value.state === 'running') {
		const missedSeconds = Math.round((Date.now() - stopwatch.value.timestamp) / 1000);
		TimeObject.setSeconds(stopwatch.value, stopwatch.value.raw + missedSeconds);
		start(true);
	}

	let serialPort;
	if (nodecg.bundleConfig.serialCOMName) {
		nodecg.log.info(`[timekeeping] Setting up serial communications via ${nodecg.bundleConfig.serialCOMName}`);
		const SerialPort = require('serialport').SerialPort;
		serialPort = new SerialPort(nodecg.bundleConfig.serialCOMName, {
			parser: require('serialport').parsers.readline('\n'),
			baudRate: 9600
		}, err => {
			if (err) {
				return nodecg.log.error(err.message);
			}
		});

		serialPort.on('data', data => {
			switch (data) {
				case 'heartbeat':
					onHeartbeatReceived();
					break;
				case 'startFinish':
					if (stopwatch.value.state === 'running') {
						// Finish all runners.
						currentRun.value.runners.forEach((runner, index) => {
							if (!runner) {
								return;
							}

							completeRunner({index, forfeit: false});
						});
					} else {
						start();

						// Resume all runners.
						currentRun.value.runners.forEach((runner, index) => {
							if (!runner) {
								return;
							}

							resumeRunner(index);
						});
					}
					break;
				default:
					nodecg.log.error('[timekeeping] Unexpected data from serial port:', data);
			}
		});

		serialPort.on('open', error => {
			serialReconnectPending = false;

			if (error) {
				nodecg.log.info('[timekeeping] Error opening serial port:', error.stack);
				attemptSerialReconnect();
				return;
			}

			nodecg.log.info('Sending response handshake');
			serialPort.write('handshake\n');
			sendHeartbeat();
			heartbeatInterval = setInterval(sendHeartbeat, 2000);
			onHeartbeatReceived();
			nodecg.log.info(`[timekeeping] Serial port ${nodecg.bundleConfig.serialCOMName} opened.`);
		});

		serialPort.on('disconnect', () => {
			nodecg.log.error('[timekeeping] Serial port disconnected.');
			clearInterval(heartbeatInterval);
			attemptSerialReconnect();
		});

		serialPort.on('error', error => {
			nodecg.log.error('[timekeeping] Serial port error:', error.stack);
			clearInterval(heartbeatInterval);
			serialReconnectPending = false;
			attemptSerialReconnect();
		});

		let lastState;
		stopwatch.on('change', newVal => {
			if (newVal.state !== lastState) {
				lastState = newVal.state;

				const args = [];
				switch (newVal.state) {
					case 'finished':
						args.push(stopwatch.value.results);
						break;
					default:
					// Do nothing.
				}

				if (canWriteToSerial()) {
					serialPort.write(`${JSON.stringify({event: newVal.state, arguments: args})}\n`);
				}
			}
		});
	}

	nodecg.listenFor('startTimer', start);
	nodecg.listenFor('stopTimer', stop);
	nodecg.listenFor('resetTimer', reset);
	nodecg.listenFor('completeRunner', data => {
		if (currentRun.value.coop) {
			// Finish all runners.
			currentRun.value.runners.forEach((runner, index) => {
				if (!runner) {
					return;
				}

				completeRunner({index, forfeit: data.forfeit});
			});
		} else {
			completeRunner(data);
		}
	});
	nodecg.listenFor('resumeRunner', index => {
		if (currentRun.value.coop) {
			// Resume all runners.
			currentRun.value.runners.forEach((runner, index) => {
				if (!runner) {
					return;
				}

				resumeRunner(index);
			});
		} else {
			resumeRunner(index);
		}
	});
	nodecg.listenFor('editTime', editTime);

	/**
	 * Starts the timer.
	 * @param {Boolean} [force=false] - Forces the timer to start again, even if already running.
	 * @returns {undefined}
	 */
	function start(force) {
		if (!force && stopwatch.value.state === 'running') {
			return;
		}

		clearInterval(tick);
		stopwatch.value.state = 'running';
		interval = setInterval(tick, 1000);
	}

	/**
	 * Increments the timer by one second.
	 * @returns {undefined}
	 */
	function tick() {
		TimeObject.increment(stopwatch.value);

		if (canWriteToSerial()) {
			serialPort.write(`${JSON.stringify({
				event: 'tick',
				arguments: [stopwatch.value.raw]
			})}\n`);
		}
	}

	/**
	 * Stops the timer.
	 * @returns {undefined}
	 */
	function stop() {
		clearInterval(interval);
		stopwatch.value.state = 'stopped';
	}

	/**
	 * Stops and resets the timer, clearing the time and results.
	 * @returns {undefined}
	 */
	function reset() {
		if (canWriteToSerial()) {
			serialPort.write(`${JSON.stringify({event: 'reset'})}\n`);
		}
		stop();
		TimeObject.setSeconds(stopwatch.value, 0);
		stopwatch.value.results = [];
	}

	/**
	 * Marks a runner as complete.
	 * @param {Number} index - The runner to modify (0-3).
	 * @param {Boolean} forfeit - Whether or not the runner forfeit.
	 * @returns {undefined}
	 */
	function completeRunner({index, forfeit}) {
		if (!stopwatch.value.results[index]) {
			stopwatch.value.results[index] = new TimeObject(stopwatch.value.raw);
		}

		stopwatch.value.results[index].forfeit = forfeit;
		if (!forfeit && canWriteToSerial()) {
			serialPort.write(`${JSON.stringify({event: 'runnerFinished'})}\n`);
		}
		recalcPlaces();
	}

	/**
	 * Marks a runner as still running.
	 * @param {Number} index - The runner to modify (0-3).
	 * @returns {undefined}
	 */
	function resumeRunner(index) {
		stopwatch.value.results[index] = null;
		recalcPlaces();

		if (stopwatch.value.state === 'finished') {
			const missedSeconds = Math.round((Date.now() - stopwatch.value.timestamp) / 1000);
			TimeObject.setSeconds(stopwatch.value, stopwatch.value.raw + missedSeconds);
			start();
		}
	}

	/**
	 * Edits the final time of a result.
	 * @param {Number} index - The result index to edit.
	 * @param {String} newTime - A hh:mm:ss (or mm:ss) formatted new time.
	 * @returns {undefined}
	 */
	function editTime({index, newTime}) {
		if (!newTime) {
			return;
		}

		const newSeconds = TimeObject.parseSeconds(newTime);
		if (isNaN(newSeconds)) {
			return;
		}

		if (index === 'master') {
			TimeObject.setSeconds(stopwatch.value, newSeconds);
		} else if (stopwatch.value.results[index]) {
			TimeObject.setSeconds(stopwatch.value.results[index], newSeconds);
			recalcPlaces();

			if (currentRun.value.runners.length === 1) {
				TimeObject.setSeconds(stopwatch.value, newSeconds);
			}
		}
	}

	/**
	 * Re-calculates the podium place for all runners.
	 * @returns {undefined}
	 */
	function recalcPlaces() {
		const finishedResults = stopwatch.value.results.filter(r => {
			if (r) {
				r.place = 0;
				return !r.forfeit;
			}

			return false;
		});

		finishedResults.sort((a, b) => {
			return a.raw - b.raw;
		});

		finishedResults.forEach((r, index) => {
			r.place = index + 1;
		});

		// If every runner is finished, stop ticking and set timer state to "finished".
		let allRunnersFinished = true;
		currentRun.value.runners.forEach((runner, index) => {
			if (!runner) {
				return;
			}

			if (!stopwatch.value.results[index]) {
				allRunnersFinished = false;
			}
		});

		if (allRunnersFinished) {
			stop();
			stopwatch.value.state = 'finished';
		}
	}

	/**
	 * Attempts to reconnect to the specified COM port after 5 seconds.
	 * @returns {undefined}
	 */
	function attemptSerialReconnect() {
		if (serialReconnectPending) {
			return;
		}

		clearTimeout(heartbeatTimeout);

		if (serialPort.isOpen()) {
			serialPort.close();
		}

		serialReconnectPending = true;
		nodecg.log.info('[timekeeping] Attempting serial port reconnect in 5 seconds.');
		setTimeout(() => {
			if (serialPort.isOpen()) {
				return;
			}

			require('serialport').list((err, ports) => {
				if (err) {
					nodecg.log.error('[timekeeping] Error listing serial ports:', err.stack);

					if (serialPort.isOpen()) {
						serialPort.close();
					}

					serialReconnectPending = false;
					attemptSerialReconnect();
					return;
				}

				const foundPort = ports.some(port => {
					if (port.comName === nodecg.bundleConfig.serialCOMName) {
						serialPort.open();
						return true;
					}

					return false;
				});

				serialReconnectPending = false;

				if (!foundPort) {
					attemptSerialReconnect();
				}
			});
		}, 5000);
	}

	/**
	 * Closes the serial port and tries to re-open it.
	 * @returns {undefined}
	 */
	function serialHeartbeatExpired() {
		nodecg.log.info('Serial heartbeat expired, attempting reconnect');
		attemptSerialReconnect();
	}

	/**
	 * Handles serial port heartbeats.
	 * @returns {undefined}
	 */
	function onHeartbeatReceived() {
		clearTimeout(heartbeatTimeout);
		heartbeatTimeout = setTimeout(serialHeartbeatExpired, HEARTBEAT_INTERVAL);
	}

	/**
	 * Sends a heartbeat to the serial device
	 * @returns {undefined}
	 */
	function sendHeartbeat() {
		if (canWriteToSerial()) {
			serialPort.write('heartbeat\n');
		}
	}

	/**
	 * Checks if we can write to the serial port.
	 * @returns {boolean} - Whether or not we can write to the port
     */
	function canWriteToSerial() {
		return serialPort && !serialPort.closing && serialPort.isOpen();
	}
};
