/* global SplitText */
(function () {
	'use strict';

	const TYPE_INTERVAL = 0.03;
	const EMPTY_OBJ = {};
	const displayDuration = nodecg.bundleConfig.displayDuration;
	const currentPrizes = nodecg.Replicant('currentPrizes');

	Polymer({
		is: 'gdq-break-prizes',

		properties: {
			tl: {
				type: TimelineLite,
				value() {
					return new TimelineLite();
				},
				readOnly: true
			}
		},

		/**
		 * Adds an animation to the global timeline for showing the current prizes
		 * @returns {undefined}
		 */
		showCurrentPrizes() {
			return new Promise(resolve => {
				if (currentPrizes.value) {
					this._doShowCurrentPrizes().then(resolve);
				} else {
					currentPrizes.once('change', () => {
						this._doShowCurrentPrizes().then(resolve);
					});
				}
			});
		},

		_doShowCurrentPrizes() {
			return new Promise(resolve => {
				if (currentPrizes.value.length <= 0) {
					setTimeout(resolve, 0);
					return;
				}

				const currentGrandPrizes = currentPrizes.value.filter(prize => prize.grand);
				const currentNormalPrizes = currentPrizes.value.filter(prize => !prize.grand);

				if (currentGrandPrizes.length > 0 || currentNormalPrizes.length > 0) {
					const prizesToDisplay = currentNormalPrizes.slice(0);
					if (currentGrandPrizes.length) {
						// Figure out what grand prize to show in this batch.
						const lastShownGrandPrizeIdx = currentGrandPrizes.indexOf(this.lastShownGrandPrize);
						const nextGrandPrizeIdx = lastShownGrandPrizeIdx >= currentGrandPrizes.length - 1 ?
							0 : lastShownGrandPrizeIdx + 1;
						const nextGrandPrize = currentGrandPrizes[nextGrandPrizeIdx];

						if (nextGrandPrize) {
							prizesToDisplay.unshift(nextGrandPrize);
							this.lastShownGrandPrize = nextGrandPrize;
						}
					}

					// Loop over each prize and queue it up on the timeline
					prizesToDisplay.forEach(this.showPrize, this);
				}

				this.tl.call(resolve);
			});
		},

		/**
		 * Adds an animation to the global timeline for showing a specific prize.
		 * @param {Object} prize - The prize to display.
		 * @returns {undefined}
		 */
		showPrize(prize) {
			this.tl.call(() => {
				this.$['prize-image-next'].src = prize.image;
			}, null, null, '+=0.1');

			let changingProvider = true;
			this.tl.call(() => {
				if (!this.$['provider-wrap'].innerText && !this.$['prize-name'].innerText) {
					return;
				}

				this.tl.pause();

				changingProvider = false;
				if (!this.$['provider-wrap'].innerText.trim().endsWith(prize.provided) && this.$['provider-wrap'].split) {
					changingProvider = true;
					this._untypeAnim(this.$['provider-wrap']).then(checkDone.bind(this));
				}

				if (this.$['prize-name'].split) {
					this._untypeAnim(this.$['prize-name']).then(checkDone.bind(this));
				}

				if (this.$['prize-minbid'].split) {
					this._untypeAnim(this.$['prize-minbid']).then(checkDone.bind(this));
				}

				let counter = 0;

				/**
				 * Resolves the promise once all the untype anims have finished.
				 * @returns {undefined}
				 */
				function checkDone() {
					counter++;
					if (!changingProvider && counter >= 2) {
						this.tl.resume();
					} else if (counter >= 3) {
						this.tl.resume();
					}
				}
			});

			this.tl.call(() => {
				if (!changingProvider) {
					return;
				}

				this.$['provider-wrap'].innerText = `Provided by: ${prize.provided}`;
				this._typeAnim(this.$['provider-wrap']);
			}, null, null, '+=0.1');

			this.tl.call(() => {
				this.$['prize-name'].innerText = prize.description;
				this._typeAnim(this.$['prize-name']);
			}, null, null, '+=0.1');

			this.tl.call(() => {
				if (this.$['prize-minbid'].split) {
					this.$['prize-minbid'].split.revert();
				}
				this.$['prize-minbid-amount'].innerText = prize.minimumbid;
				this._typeAnim(this.$['prize-minbid']);
			}, null, null, '+=0.1');

			this.tl.to(this.$['prize-image-next'], 0.667, {
				opacity: 1,
				ease: Power1.easeInOut
			});

			this.tl.to({}, 0.1, {
				onComplete() {
					this.$['prize-image-current'].src = prize.image;
				},
				onCompleteScope: this
			}, '+=0.1');
			this.tl.set(this.$['prize-image-next'], {opacity: 0}, '+=0.1');

			// Give the prize some time to show
			this.tl.to({}, displayDuration, {});
		},

		_typeAnim($el, {splitType = 'chars,words'} = {}) {
			const tl = new TimelineLite();
			const split = new SplitText($el, {
				type: splitType,
				charsClass: 'character style-scope gdq-break-bids',
				linesClass: 'line style-scope gdq-break-bids'
			});
			$el.split = split;

			switch (splitType) {
				case 'chars':
					tl.staggerFrom(split.chars, 0.001, {
						visibility: 'hidden'
					}, TYPE_INTERVAL);

					break;
				case 'chars,words':
				case 'chars,words,lines':
					split.words.forEach(word => {
						tl.staggerFrom(word.children, 0.001, {
							visibility: 'hidden'
						}, TYPE_INTERVAL);

						tl.to(EMPTY_OBJ, TYPE_INTERVAL, EMPTY_OBJ);
					});
					break;
				default:
					throw new Error(`Unexpected splitType "${splitType}"`);
			}

			return tl;
		},

		_untypeAnim($el) {
			return new Promise(resolve => {
				if (!$el.split) {
					return setTimeout(resolve, 0);
				}

				const tl = new TimelineLite({
					onComplete: resolve
				});

				const split = $el.split;

				if (split.words) {
					split.words.forEach(word => {
						tl.staggerTo(word.children, 0.001, {
							visibility: 'hidden'
						}, TYPE_INTERVAL);

						tl.to(EMPTY_OBJ, TYPE_INTERVAL, EMPTY_OBJ);
					});
				} else {
					tl.staggerFrom(split.chars, 0.001, {
						visibility: 'hidden'
					}, TYPE_INTERVAL);
				}

				return tl;
			});
		}
	});
})();
