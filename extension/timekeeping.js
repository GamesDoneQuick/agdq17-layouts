'use strict';

const TimeObject = require('./classes/time-object');
const HEARTBEAT_INTERVAL = 2500;
let SerialPort;
let activeSerialPort;
let interval;
let heartbeatTimeout;
let heartbeatInterval;

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

	if (nodecg.bundleConfig.enableTimerSerial) {
		nodecg.log.info(`[timekeeping] Setting up serial communications`);
		SerialPort = require('serialport');
		pollForDesiredSerialPort();
		setInterval(pollForDesiredSerialPort, 5000);

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
					writeToSerial(`${JSON.stringify({event: newVal.state, arguments: args})}\n`);
				}
			}
		});
	}

	if (nodecg.bundleConfig.footpedal.enabled) {
		const gamepad = require('gamepad');

		gamepad.init();

		// Poll for events
		setInterval(gamepad.processEvents, 16);

		// Listen for buttonId down event from our target gamepad.
		gamepad.on('down', (id, num) => {
			if (num !== nodecg.bundleConfig.footpedal.buttonId) {
				return;
			}

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
		});
	}

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
			writeToSerial(`${JSON.stringify({
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
			writeToSerial(`${JSON.stringify({event: 'reset'})}\n`);
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
			writeToSerial(`${JSON.stringify({event: 'runnerFinished'})}\n`);
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
	 * Does nothing if there's already an activeSerialPort.
	 * Checks all connected serial COM devices for ones with an Arduino manufacturer string.
	 * Then, emits a 'handshake' message to each of those devices, and gives them HEARTBEAT_INTERVAL
	 * milliseconds to respond. If the port responds to the handshake in time, that port is taken as the
	 * new activeSerialPort.
	 * @returns {undefined}
	 */
	function pollForDesiredSerialPort() {
		if (activeSerialPort) {
			return;
		}

		SerialPort.list((err, availableCOMs) => {
			if (err) {
				nodecg.log.error('Error listing serialports:', err);
				return;
			}

			if (activeSerialPort) {
				return;
			}

			const availableArduinoCOMs = availableCOMs.filter(port => {
				return port.manufacturer === 'Arduino LLC (www.arduino.cc)';
			});

			availableArduinoCOMs.forEach(availableArduinoCOM => {
				const port = new SerialPort(availableArduinoCOM.comName, {
					parser: require('serialport').parsers.readline('\n'),
					baudRate: 9600
				}, err => {
					if (err) {
						return nodecg.log.error('Error opening propsective port:\n\t', err.message);
					}

					if (canWriteToSerial(port)) {
						port.write('handshake\n', error => {
							if (error) {
								// We have to just discard this error, because an Arduino programmed in Joypad
								// mode will show up as an available COM, but can't actually be written to.
							}
						});
					}
				});

				const handshakeTimeout = setTimeout(() => {
					if (port && port.isOpen()) {
						port.close(error => {
							if (error) {
								nodecg.log.error('Error closing prospective port that failed to handshake:\n\t', error);
							}
						});
					}
				}, HEARTBEAT_INTERVAL);

				port.on('data', data => {
					switch (data) {
						case 'handshake':
							nodecg.log.info('handshake received');
							clearTimeout(handshakeTimeout);
							takePort(port);
							break;
						default:
							break;
					}
				});
			});
		});
	}

	/**
	 * Takes one of the prospectively opened ports as the new activeSerialPort.
	 * This attaches all the event listeners we need and starts emitting and listening for heartbeats.
	 * @param {SerialPort} port - The port to take as the new activeSerialPort.
	 * @returns {undefined}
	 */
	function takePort(port) {
		activeSerialPort = port;
		clearTimeout(heartbeatTimeout);
		clearInterval(heartbeatInterval);
		sendHeartbeat();
		heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL - 500);
		onHeartbeatReceived();
		nodecg.log.info('[timekeeping] activeSerialPort handshaken, open for data.');

		port.on('data', data => {
			if (port !== activeSerialPort) {
				return;
			}

			switch (data) {
				case 'handshake':
					nodecg.log.info('handshake received');
					break;
				case 'heartbeat':
					onHeartbeatReceived();
					break;
				default:
					nodecg.log.error('[timekeeping] Unexpected data from serial port:', data);
			}
		});

		port.on('disconnect', () => {
			if (port !== activeSerialPort) {
				return;
			}

			nodecg.log.error('[timekeeping] activeSerialPort disconnected.');
			clearInterval(heartbeatInterval);
			destroyActiveSerialPort();
		});

		port.on('close', () => {
			if (port !== activeSerialPort) {
				return;
			}

			nodecg.log.error('[timekeeping] activeSerialPort closed.');
			clearInterval(heartbeatInterval);
			destroyActiveSerialPort();
		});

		port.on('error', error => {
			if (port !== activeSerialPort) {
				return;
			}

			if (error) {
				nodecg.log.error('[timekeeping] activeSerialPort error:\n\t', error.stack);
			}
		});
	}

	/**
	 * Closes the serial port and tries to re-open it.
	 * @returns {undefined}
	 */
	function serialHeartbeatExpired() {
		nodecg.log.info('Serial heartbeat expired, closing activeSerialPort');
		destroyActiveSerialPort();
	}

	/**
	 * Handles serial port heartbeats.
	 * @returns {undefined}
	 */
	function onHeartbeatReceived() {
		if (!activeSerialPort) {
			return;
		}

		clearTimeout(heartbeatTimeout);
		heartbeatTimeout = setTimeout(serialHeartbeatExpired, HEARTBEAT_INTERVAL);
	}

	/**
	 * Sends a heartbeat to the serial device
	 * @returns {undefined}
	 */
	function sendHeartbeat() {
		if (canWriteToSerial()) {
			writeToSerial('heartbeat\n');
		}
	}

	/**
	 * Checks if we can write to the given serial port.
	 * @param {SerialPort} [port] - The serial port to check, defaults to activeSerialPort.
	 * @returns {boolean} - Whether or not we can write to the port
     */
	function canWriteToSerial(port) {
		if (typeof port === 'undefined') {
			port = activeSerialPort;
		}

		return port && !port.closing && port.isOpen();
	}

	/**
	 * Writes the given data to the activeSerialPort.
	 * @param {string} data - The string of data to write.
	 * @returns {undefined}
	 */
	function writeToSerial(data) {
		activeSerialPort.write(data, error => {
			if (error) {
				nodecg.log.error('Error writing to activeSerialPort:\n\t', error);
			}
		});
	}

	/**
	 * Destroys the current activeSerialPort, removing all listeners and closing the port if still open.
	 * Also sets `activeSerialPort` to null.
	 * @returns {undefined}
	 */
	function destroyActiveSerialPort() {
		clearInterval(heartbeatInterval);
		clearTimeout(heartbeatTimeout);
		if (!activeSerialPort) {
			return;
		}

		activeSerialPort.removeAllListeners('data');
		activeSerialPort.removeAllListeners('open');
		activeSerialPort.removeAllListeners('disconnect');
		activeSerialPort.removeAllListeners('close');
		activeSerialPort.removeAllListeners('error');
		if (canWriteToSerial()) {
			activeSerialPort.close(error => {
				if (error) {
					nodecg.log.info('Error closing activeSerialPort:\n\t', error);
				}
			});
		}
		activeSerialPort = null;
	}
};
