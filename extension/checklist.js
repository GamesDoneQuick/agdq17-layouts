'use strict';

const equals = require('deep-equal');
const clone = require('clone');

module.exports = function (nodecg) {
	// Create defaults array
	const checklistDefault = {
		extraContent: [
			{name: 'Check for Advertisement', complete: false},
			{name: 'Check for Interview', complete: false}
		],
		techStationDuties: [
			{name: 'Reset Timer', complete: false},
			{name: 'Stop/Start Recording', complete: false},
			{name: 'Check Tech Notes', complete: false},
			{name: 'Stream Layout', complete: false},
			{name: 'Runner Info/Position', complete: false},
			{name: 'Game Deinterlacing', complete: false},
			{name: 'Camera', complete: false}
		],
		otherDuties: [
			{name: 'Cue Break Music', complete: false},
			{name: 'Runner Game Audio', complete: false},
			{name: 'TVs have Video', complete: false},
			{name: 'Commentator Mics', complete: false},
			{name: 'Stream Audio', complete: false},
			{name: 'Steam Notifications Off', complete: false}
		]
	};

	// Instantiate replicant with defaults object, which will load if no persisted data is present.
	const checklist = nodecg.Replicant('checklist', {defaultValue: checklistDefault});

	// Reconcile differences between persisted value and what we expect the checklistDefault to be.
	const persistedValue = checklist.value;
	if (!equals(persistedValue, checklistDefault)) {
		const mergedChecklist = clone(checklistDefault);

		for (const category in checklistDefault) {
			if (!checklistDefault.hasOwnProperty(category)) {
				continue;
			}

			mergedChecklist[category] = checklistDefault[category].map(task => {
				if (persistedValue[category]) {
					const persistedTask = persistedValue[category].find(({name}) => name === task.name);
					if (persistedTask) {
						return persistedTask;
					}
				}

				return task;
			});
		}

		checklist.value = mergedChecklist;
	}

	const checklistComplete = nodecg.Replicant('checklistComplete', {defaultValue: false});
	checklist.on('change', newVal => {
		let foundIncompleteTask = false;

		for (const category in newVal) {
			if (!newVal.hasOwnProperty(category)) {
				continue;
			}

			foundIncompleteTask = newVal[category].some(task => !task.complete);

			if (foundIncompleteTask) {
				break;
			}
		}

		checklistComplete.value = !foundIncompleteTask;
	});

	return {
		reset() {
			for (const category in checklist.value) {
				if (!checklist.value.hasOwnProperty(category)) {
					continue;
				}

				checklist.value[category].forEach(task => {
					task.complete = false;
				});
			}
		}
	};
};
