(function () {
	'use strict';

	const show = document.getElementById('show');
	const hide = document.getElementById('hide');
	const auto = document.getElementById('auto');
	const interviewNames = nodecg.Replicant('interviewNames');
	const showing = nodecg.Replicant('interviewLowerthirdShowing');
	const timeRemaining = nodecg.Replicant('interviewLowerthirdTimeRemaining');

	show.addEventListener('click', () => {
		takeNames();
		showing.value = true;
	});

	hide.addEventListener('click', () => {
		showing.value = false;
	});

	auto.addEventListener('click', () => {
		takeNames();
		nodecg.sendMessage('pulseInterviewLowerthird', 10);
	});

	showing.on('change', newVal => {
		if (newVal) {
			show.setAttribute('disabled', 'true');
			hide.removeAttribute('disabled');
			auto.setAttribute('disabled', 'true');
			auto.innerText = timeRemaining.value;
		} else {
			show.removeAttribute('disabled');
			hide.setAttribute('disabled', 'true');
			auto.removeAttribute('disabled');
			auto.innerText = 'Auto';
		}
	});

	timeRemaining.on('change', newVal => {
		if (showing.value) {
			auto.innerText = newVal;
		} else {
			auto.innerText = 'Auto';
		}
	});

	/**
	 * Takes the names currently entered into the paper-inputs.
	 * @returns {undefined}
	 */
	function takeNames() {
		const paperInputs = Array.from(document.getElementsByTagName('paper-input'));
		interviewNames.value = paperInputs.map(input => input.value);
	}
})();
