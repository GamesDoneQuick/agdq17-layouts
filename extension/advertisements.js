'use strict';

const fs = require('fs');
const format = require('util').format;
const singleInstance = require('../../../lib/graphics/single_instance');

module.exports = function (nodecg) {
	const currentRun = nodecg.Replicant('currentRun');
	const playingAd = nodecg.Replicant('playingAd', {defaultValue: false, persistent: false});
	const adPageOpen = nodecg.Replicant('adPageOpen', {defaultValue: false, persistent: false});

	singleInstance.on('graphicAvailable', url => {
		if (url === `/graphics/${nodecg.bundleName}/advertisements.html`) {
			adPageOpen.value = false;
			playingAd.value = false;
		}
	});

	nodecg.listenFor('logAdPlay', ad => {
		const logStr = format('%s, %s, %s, %s\n',
			new Date().toISOString(), ad.base, currentRun.value.name);

		fs.appendFile('logs/ad_log.csv', logStr, err => {
			if (err) {
				nodecg.log.error('[advertisements] Error appending to log:', err.stack);
			}
		});
	});
};
