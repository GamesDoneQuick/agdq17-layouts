(function () {
	'use strict';

	const stopwatch = nodecg.Replicant('stopwatch');
	const currentRun = nodecg.Replicant('currentRun');
	const checklistComplete = nodecg.Replicant('checklistComplete');

	Polymer({
		is: 'gdq-timekeeper',

		properties: {
			checklistIncomplete: {
				type: Boolean,
				reflectToAttribute: true,
				value: false
			}
		},

		ready() {
			stopwatch.on('change', this.stopwatchChanged.bind(this));
			currentRun.on('change', newVal => {
				const runners = newVal.runners.slice(0);
				runners.length = 4;
				for (let i = 0; i < 4; i++) {
					runners[i] = runners[i] || false;
				}
				this.runners = runners;
				this.coop = newVal.coop;
			});
			checklistComplete.on('change', newVal => {
				this.checklistIncomplete = !newVal;
			});
		},

		stopwatchChanged(newVal) {
			this.state = newVal.state;
			this.time = newVal.formatted;
			this.results = newVal.results.slice(0);
		},

		confirmReset() {
			this.$.resetDialog.open();
		},

		startTimer() {
			nodecg.sendMessage('startTimer');
		},

		stopTimer() {
			nodecg.sendMessage('stopTimer');
		},

		resetTimer() {
			nodecg.sendMessage('resetTimer');
		},

		calcWingText(checklistIncomplete, coop) {
			if (checklistIncomplete) {
				return 'CHECKLIST INCOMPLETE';
			}

			if (coop) {
				return 'CO-OP RUN';
			}

			return '';
		},

		calcStartDisabled(checklistIncomplete, state) {
			return checklistIncomplete || state !== 'stopped';
		},

		calcPauseDisabled(state) {
			return state !== 'running';
		},

		calcEditDisabled(results, runnerIndex) {
			return !results[runnerIndex];
		},

		calcRunnerStatus(results, index) {
			if (results[index]) {
				return results[index].formatted;
			}

			return 'Running';
		},

		calcRunnerStatusClass(results, index) {
			if (results[index] && !results[index].forfeit) {
				return 'finished';
			}

			return '';
		},

		calcFinishHidden(results, index) {
			return results[index] && !results[index].forfeit;
		},

		calcResumeHidden(results, index) {
			return !results[index];
		},

		calcForfeitHidden(results, index) {
			return results[index] && results[index].forfeit;
		},

		finishRunner(e) {
			const index = e.target.closest('.runner').getAttribute('data-index');
			nodecg.sendMessage('completeRunner', {index, forfeit: false});
		},

		forfeitRunner(e) {
			const index = e.target.closest('.runner').getAttribute('data-index');
			nodecg.sendMessage('completeRunner', {index, forfeit: true});
		},

		resumeRunner(e) {
			const index = e.target.closest('.runner').getAttribute('data-index');
			nodecg.sendMessage('resumeRunner', index);
		},

		editMasterTime() {
			this.$['editDialog-text'].textContent = `Enter a new master time.`;
			this.$.editDialog.setAttribute('data-index', 'master');
			this.$['editDialog-input'].value = this.time;
			this.$.editDialog.open();
		},

		editRunnerTime(e) {
			const runnerEl = e.target.closest('.runner');
			const index = runnerEl.getAttribute('data-index');
			this.$['editDialog-text'].innerHTML = `Enter a new final time for <b>${runnerEl.getAttribute('data-name')}.</b>`;
			this.$.editDialog.setAttribute('data-index', index);
			this.$['editDialog-input'].value = this.results[index].formatted;
			this.$.editDialog.open();
		},

		saveEditedTime() {
			nodecg.sendMessage('editTime', {
				index: this.$.editDialog.getAttribute('data-index'),
				newTime: this.$['editDialog-input'].value
			});
			this.$['editDialog-input'].value = '';
		}
	});
})();
