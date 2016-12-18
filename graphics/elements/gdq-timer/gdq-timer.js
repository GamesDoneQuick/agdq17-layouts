(function () {
	'use strict';

	const stopwatch = nodecg.Replicant('stopwatch');

	Polymer({
		is: 'gdq-timer',

		properties: {
			paused: {
				type: Boolean,
				observer: 'pausedChanged',
				reflectToAttribute: true
			},
			finished: {
				type: Boolean,
				observer: 'finishedChanged',
				reflectToAttribute: true
			}
		},

		pausedChanged(newVal) {
			if (newVal && this.finished) {
				this.finished = false;
			}
		},

		finishedChanged(newVal) {
			if (newVal && this.paused) {
				this.paused = false;
			}
		},

		ready() {
			stopwatch.on('change', newVal => {
				this.time = newVal.formatted;

				if (newVal.state === 'stopped' && newVal.raw !== 0) {
					this.paused = true;
				} else if (newVal.state === 'finished') {
					this.finished = true;
				} else {
					this.paused = false;
					this.finished = false;
				}
			});
		}
	});
})();
