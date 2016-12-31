(function () {
	'use strict';

	const interviewNames = nodecg.Replicant('interview:names');
	const lowerthirdShowing = nodecg.Replicant('interview:lowerthirdShowing');
	const questionShowing = nodecg.Replicant('interview:questionShowing');
	const timeRemaining = nodecg.Replicant('interview:lowerthirdTimeRemaining');
	const runners = nodecg.Replicant('runners');

	Polymer({
		is: 'gdq-interview',

		properties: {
			lowerthirdShowing: {
				type: Boolean
			},
			questionShowing: {
				type: Boolean,
				reflectToAttribute: true
			},
			_typeaheadCandidates: {
				type: Array,
				value() {
					return [];
				}
			}
		},

		ready() {
			runners.on('change', newVal => {
				this._typeaheadCandidates = newVal.filter(runner => runner).map(runner => runner.name);
			});

			this.$.show.addEventListener('click', () => {
				this.takeNames();
				lowerthirdShowing.value = true;
			});

			this.$.hide.addEventListener('click', () => {
				lowerthirdShowing.value = false;
			});

			this.$.auto.addEventListener('click', () => {
				this.takeNames();
				nodecg.sendMessage('pulseInterviewLowerthird', 10);
			});

			lowerthirdShowing.on('change', newVal => {
				this.lowerthirdShowing = newVal;
				if (newVal) {
					this.$.hide.removeAttribute('disabled');
					this.$.auto.setAttribute('disabled', 'true');
					this.$.auto.innerText = timeRemaining.value;
				} else {
					this.$.hide.setAttribute('disabled', 'true');
					this.$.auto.removeAttribute('disabled');
					this.$.auto.innerText = 'Auto';
				}
			});

			questionShowing.on('change', newVal => {
				this.questionShowing = newVal;
			});

			timeRemaining.on('change', newVal => {
				if (lowerthirdShowing.value) {
					this.$.auto.innerText = newVal;
				} else {
					this.$.auto.innerText = 'Auto';
				}
			});

			interviewNames.on('change', newVal => {
				const typeaheads = Polymer.dom(this.root).querySelectorAll('nodecg-typeahead-input');

				if (!newVal || newVal.length <= 0) {
					typeaheads.forEach(typeahead => {
						typeahead.value = '';
					});
					return;
				}

				if (newVal.length === 5) {
					typeaheads[0].value = newVal[0];
				}

				const lastFour = newVal.slice(-4);
				lastFour.forEach((name, index) => {
					typeaheads[index + 1].value = name;
				});
			});
		},

		calcStartDisabled(lowerthirdShowing, questionShowing) {
			return lowerthirdShowing || questionShowing;
		},

		/**
		 * Takes the names currently entered into the nodecg-typeahead-inputs.
		 * @returns {undefined}
		 */
		takeNames() {
			const paperInputs = Polymer.dom(this.root).querySelectorAll('nodecg-typeahead-input:not([disabled])');
			interviewNames.value = paperInputs.map(input => input.value);
		}
	});
})();
