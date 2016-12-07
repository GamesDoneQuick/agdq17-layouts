'use strict';

module.exports = function (nodecg) {
	const lowerthirdShowing = nodecg.Replicant('interviewLowerthirdShowing', {defaultValue: false, persistent: false});
	const lowerthirdPulsing = nodecg.Replicant('interviewLowerthirdPulsing', {defaultValue: false, persistent: false});
	const lowerthirdPulseTimeRemaining = nodecg.Replicant('interviewLowerthirdTimeRemaining', {
		defaultValue: 0,
		persistent: false
	});
	let timeout;
	let interval;
	nodecg.Replicant('interviewNames', {defaultValue: [], persistent: false});

	lowerthirdShowing.on('change', newVal => {
		if (!newVal) {
			clearInterval(interval);
			clearTimeout(timeout);
			lowerthirdPulsing.value = false;
			lowerthirdPulseTimeRemaining.value = 0;
		}
	});

	nodecg.listenFor('pulseInterviewLowerthird', duration => {
		// Don't stack pulses
		if (lowerthirdPulsing.value) {
			return;
		}

		lowerthirdShowing.value = true;
		lowerthirdPulsing.value = true;
		lowerthirdPulseTimeRemaining.value = duration;

		// Count down lowerthirdPulseTimeRemaining
		interval = setInterval(() => {
			if (lowerthirdPulseTimeRemaining.value > 0) {
				lowerthirdPulseTimeRemaining.value--;
			} else {
				clearInterval(interval);
				lowerthirdPulseTimeRemaining.value = 0;
			}
		}, 1000);

		// End pulse after "duration" seconds
		timeout = setTimeout(() => {
			clearInterval(interval);
			lowerthirdShowing.value = false;
			lowerthirdPulsing.value = false;
		}, duration * 1000);
	});
};
