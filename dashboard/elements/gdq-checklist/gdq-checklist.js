(function () {
	'use strict';

	const checklist = nodecg.Replicant('checklist');

	Polymer({
		is: 'gdq-checklist',

		listeners: {
			change: '_checkboxChanged'
		},

		ready() {
			checklist.on('change', newVal => {
				newVal = JSON.parse(JSON.stringify(newVal));
				this.extraContent = newVal.extraContent;
				this.techStationDuties = newVal.techStationDuties;
				this.otherDuties = newVal.otherDuties;
			});
		},

		_checkboxChanged(e) {
			const category = e.target.getAttribute('category');
			const name = e.target.innerText.trim();
			checklist.value[category].find(task => {
				if (task.name === name) {
					task.complete = e.target.checked;
					return true;
				}

				return false;
			});
		}
	});
})();
