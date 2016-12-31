(function () {
	'use strict';

	const interviewNames = nodecg.Replicant('interviewNames');
	const showing = nodecg.Replicant('interviewLowerthirdShowing');
	const timeRemaining = nodecg.Replicant('interviewLowerthirdTimeRemaining');

	Polymer({
		is: 'gdq-interview',

		ready() {
			this.$.show.addEventListener('click', () => {
				this.takeNames();
				showing.value = true;
			});

			this.$.hide.addEventListener('click', () => {
				showing.value = false;
			});

			this.$.auto.addEventListener('click', () => {
				this.takeNames();
				nodecg.sendMessage('pulseInterviewLowerthird', 10);
			});

			showing.on('change', newVal => {
				if (newVal) {
					this.$.show.setAttribute('disabled', 'true');
					this.$.hide.removeAttribute('disabled');
					this.$.auto.setAttribute('disabled', 'true');
					this.$.auto.innerText = timeRemaining.value;
				} else {
					this.$.show.removeAttribute('disabled');
					this.$.hide.setAttribute('disabled', 'true');
					this.$.auto.removeAttribute('disabled');
					this.$.auto.innerText = 'Auto';
				}
			});

			timeRemaining.on('change', newVal => {
				if (showing.value) {
					this.$.auto.innerText = newVal;
				} else {
					this.$.auto.innerText = 'Auto';
				}
			});
		},

		/**
		 * Takes the names currently entered into the paper-inputs.
		 * @returns {undefined}
		 */
		takeNames() {
			const paperInputs = Polymer.dom(this.root).querySelectorAll('paper-input');
			interviewNames.value = paperInputs.map(input => input.value);
		}
	});
})();
