(function () {
	'use strict';

	Polymer({
		is: 'gdq-schedule-runinfo',

		properties: {
			notes: {
				type: String,
				observer: '_notesChanged'
			}
		},

		_notesChanged(newVal) {
			if (newVal) {
				this.$.notes.querySelector('.value').innerHTML = newVal.replace(/\r\n/g, '<br/>').replace(/\n/g, '<br/>');
			} else {
				this.$.notes.querySelector('.value').innerHTML = '';
			}
		},

		setRun(run) {
			this.name = run.name;
			this.console = run.console;
			this.runners = run.runners;
			this.releaseYear = run.releaseYear;
			this.estimate = run.estimate;
			this.category = run.category;
			this.order = run.order;
			this.notes = run.notes;
			this.coop = run.coop;
			this.originalValues = run.originalValues;
		},

		calcName(name) {
			if (name) {
				return name.split('\\n').join(' ');
			}

			return name;
		},

		calcModified(original) {
			return typeof original === 'undefined' || original === null ? '' : 'modified';
		}
	});
})();
