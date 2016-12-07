'use strict';

const DONATION_STATS_URL = 'https://gamesdonequick.com/tracker/18?json';
const POLL_INTERVAL = 60 * 1000;

const Q = require('q');
const request = require('request');
const numeral = require('numeral');

let updateInterval;

module.exports = function (nodecg) {
	const total = nodecg.Replicant('total', {
		defaultValue: {
			raw: 0,
			formatted: '$0'
		}
	});

	const autoUpdateTotal = nodecg.Replicant('autoUpdateTotal', {defaultValue: true});
	autoUpdateTotal.on('change', newVal => {
		if (newVal) {
			nodecg.log.info('Automatic updating of donation total enabled');
			updateTotal(true);
		} else {
			nodecg.log.warn('Automatic updating of donation total DISABLED');
			clearInterval(updateInterval);
		}
	});

	nodecg.listenFor('setTotal', raw => {
		total.value = {
			raw: parseFloat(raw),
			formatted: numeral(raw).format('$0,0')
		};
	});

	// Get initial data
	update();

	if (autoUpdateTotal.value) {
		// Get latest prize data every POLL_INTERVAL milliseconds
		nodecg.log.info('Polling donation total every %d seconds...', POLL_INTERVAL / 1000);
		clearInterval(updateInterval);
		updateInterval = setInterval(update, POLL_INTERVAL);
	} else {
		nodecg.log.info('Automatic update of total is disabled, will not poll until enabled');
	}

	// Dashboard can invoke manual updates
	nodecg.listenFor('updateTotal', updateTotal);

	/**
	 * Handles manual "updateTotal" requests.
	 * @param {Boolean} [silent = false] - Whether to print info to logs or not.
	 * @param {Function} [cb] - The callback to invoke after the total has been updated.
	 * @returns {undefined}
	 */
	function updateTotal(silent, cb) {
		if (!silent) {
			nodecg.log.info('Manual donation total update button pressed, invoking update...');
		}

		clearInterval(updateInterval);
		updateInterval = setInterval(update, POLL_INTERVAL);
		update()
			.then(updated => {
				if (updated) {
					nodecg.log.info('Donation total successfully updated');
				} else {
					nodecg.log.info('Donation total unchanged, not updated');
				}

				cb(null, updated);
			}, error => {
				cb(error);
			});
	}

	/**
	 * Updates the "total" replicant with the latest value from the GDQ Tracker API.
	 * @returns {Promise} - A promise.
	 */
	function update() {
		const deferred = Q.defer();
		request(DONATION_STATS_URL, (error, response, body) => {
			if (!error && response.statusCode === 200) {
				let stats;
				try {
					stats = JSON.parse(body);
				} catch (e) {
					nodecg.log.error('Could not parse total, response not valid JSON:\n\t', body);
					return;
				}

				const freshTotal = parseFloat(stats.agg.amount || 0);

				if (freshTotal === total.value.raw) {
					deferred.resolve(false);
				} else {
					total.value = {
						raw: freshTotal,
						formatted: numeral(freshTotal).format('$0,0')
					};
					deferred.resolve(true);
				}
			} else {
				let msg = 'Could not get donation total, unknown error';
				if (error) {
					msg = `Could not get donation total:\n${error.message}`;
				} else if (response) {
					msg = `Could not get donation total, response code ${response.statusCode}`;
				}
				nodecg.log.error(msg);
				deferred.reject(msg);
			}
		});
		return deferred.promise;
	}
};
