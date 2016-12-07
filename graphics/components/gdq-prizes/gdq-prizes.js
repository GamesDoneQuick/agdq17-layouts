(function () {
	'use strict';

	const TRANSITION_DURATION = 1.2;
	const DESCRIPTION_TRANSITION_DURATON = TRANSITION_DURATION / 2 - 0.1;
	const currentPrizes = nodecg.Replicant('currentPrizes');
	const displayDuration = nodecg.bundleConfig.displayDuration;

	Polymer({
		is: 'gdq-prizes',

		ready() {
			this.tl = new TimelineMax({repeat: -1});
			this.init();
		},

		init() {
			const showPrize = this.showPrize.bind(this);
			currentPrizes.on('change', newVal => {
				this.tl.clear();
				this.tl.to(this.$.images, TRANSITION_DURATION / 2, {
					x: '0%',
					ease: Power2.easeInOut
				});
				newVal.forEach(showPrize);
			});
		},

		/**
		 * Queues an animation to show a prize.
		 * @param {Object} prize - The prize to show.
		 * @param {Number} index - The index of this prize.
		 * @returns {undefined}
		 */
		showPrize(prize, index) {
			if (!prize.image) {
				return;
			}

			const tl = this.tl;
			const enterLabel = `prizeEnter${index}`;

			tl.call(() => {
				this.$.next.src = prize.image;
			}, null, null, '+=0.1');

			tl.add(enterLabel, '+=0.01');

			tl.to(this.$.images, TRANSITION_DURATION, {
				x: '-50%',
				ease: Power2.easeInOut
			}, enterLabel);

			tl.to(this.$.description, DESCRIPTION_TRANSITION_DURATON, {
				y: '100%',
				ease: Power2.easeIn,
				onComplete: function () {
					this.$.descriptionText.textContent = prize.description;
				}.bind(this)
			}, enterLabel);

			tl.to(this.$.description, DESCRIPTION_TRANSITION_DURATON, {
				y: '0%',
				ease: Power2.easeOut
			}, `-=${DESCRIPTION_TRANSITION_DURATON}`);

			tl.to({}, 0.1, {
				onComplete: function () {
					this.$.current.src = prize.image;
					TweenLite.set(this.$.images, {clearProps: 'x'});
				}.bind(this)
			}, '+=0.1');

			tl.to({}, displayDuration, {});
		}
	});
})();
