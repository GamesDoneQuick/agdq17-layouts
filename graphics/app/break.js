(function () {
	'use strict';

	const $screenTransition = document.getElementById('screen-transition');
	const $bids = document.querySelector('gdq-break-bids');
	const $prizes = document.querySelector('gdq-break-prizes');

	// Logo anim
	const LOGO_FADE_INTERVAL = 20;
	const LOGO_FADE_DURATION = 1;
	const LOGO_FADE_OUT_EASE = Power1.easeIn;
	const LOGO_FADE_IN_EASE = Power1.easeOut;
	const $gdqLogo = document.getElementById('gdqLogo');
	const $charityLogo = document.getElementById('charityLogo');
	const logoTL = new TimelineMax({repeat: -1});

	logoTL.to($gdqLogo, LOGO_FADE_DURATION, {
		opacity: 1,
		ease: LOGO_FADE_IN_EASE
	});

	logoTL.to($gdqLogo, LOGO_FADE_DURATION, {
		opacity: 0,
		ease: LOGO_FADE_OUT_EASE
	}, `+=${LOGO_FADE_INTERVAL}`);

	logoTL.to($charityLogo, LOGO_FADE_DURATION, {
		opacity: 1,
		ease: LOGO_FADE_IN_EASE
	});

	logoTL.to($charityLogo, LOGO_FADE_DURATION, {
		opacity: 0,
		ease: LOGO_FADE_OUT_EASE
	}, `+=${LOGO_FADE_INTERVAL}`);

	window.addEventListener('DOMContentLoaded', () => {
		TweenLite.to(document.body, 0.333, {
			opacity: 1,
			ease: Power1.easeOut
		});

		setTimeout(loop, 100);
	});

	/**
	 * The main bids and prizes loop. Only call it once, it will call itself after that.
	 * @returns {undefined}
	 */
	function loop() {
		$bids.removeAttribute('hidden');
		$prizes.setAttribute('hidden', 'true');
		$screenTransition.style.opacity = 0;
		$bids.showCurrentBids().then(() => {
			$screenTransition.style.opacity = 1;
			return new Promise(resolve => {
				setTimeout(() => {
					$screenTransition.style.opacity = 0;
					$bids.setAttribute('hidden', 'true');
					$prizes.removeAttribute('hidden');
					return $prizes.showCurrentPrizes().then(resolve);
				}, 667);
			});
		}).then(() => {
			$screenTransition.style.opacity = 1;
			setTimeout(loop, 667);
		});
	}
})();
