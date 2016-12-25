/* global SplitText */
(function () {
	'use strict';

	const displayDuration = nodecg.bundleConfig.displayDuration;
	const currentBids = nodecg.Replicant('currentBids');
	const currentPrizes = nodecg.Replicant('currentPrizes');
	const TYPE_INTERVAL = 0.03;
	const CHALLENGE_PIP_INTERVAL = 0.03;
	const TUG_PIP_INTERVAL = 0.04;
	const EMPTY_OBJ = {};
	const BIG_PIP_WIDTH = 6;
	const SMALL_PIP_WIDTH = 4;
	const CHALLENGE_BAR_WIDTH = 372;

	Polymer({
		is: 'gdq-break-bids',

		properties: {
			runName: {
				type: String,
				observer: '_runNameChanged'
			},
			bidDescription: {
				type: String,
				observer: '_bidDescriptionChanged'
			},
			bidType: {
				type: String,
				reflectToAttribute: true
			},
			tl: {
				type: TimelineLite,
				value() {
					return new TimelineLite();
				},
				readOnly: true
			}
		},

		_runNameChanged(newVal) {
			this.$['runName-content'].innerHTML = this.formatRunName(newVal);
			this._typeAnim(this.$['runName-content']);
		},

		_bidDescriptionChanged(newVal) {
			this.$['bidDescription-content'].innerHTML = newVal;
			this._typeAnim(this.$['bidDescription-content'], {splitType: 'chars,words,lines'});
		},

		ready() {
			return;

			// CTA is the first thing we show, so we use this to start our loop
			this.showCurrentBids();
		},

		_typeAnim($el, {splitType = 'chars,words'} = {}) {
			const tl = new TimelineLite();
			const split = new SplitText($el, {
				type: splitType,
				charsClass: 'character style-scope gdq-break-bids'
			});

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

		/**
		 * Adds an animation to the global timeline for showing all current bids.
		 * @returns {undefined}
		 */
		showCurrentBids() {
			if (currentBids.value.length > 0) {
				let showedLabel = false;

				// Figure out what bids to display in this batch
				const bidsToDisplay = [];

				currentBids.value.forEach(bid => {
					// Don't show closed bids in the automatic rotation.
					if (bid.state.toLowerCase() === 'closed') {
						return;
					}

					// We have at least one bid to show, so show the label
					if (!showedLabel) {
						showedLabel = true;
						this.tl.to({}, 0.3, {
							onStart: this.showLabel.bind(this),
							onStartParams: ['DONATION INCENTIVES', '21px']
						});
					}

					// If we have already have our three bids determined, we still need to check
					// if any of the remaining bids are for the same speedrun as the third bid.
					// This ensures that we are never displaying a partial list of bids for a given speedrun.
					if (bidsToDisplay.length < 3) {
						bidsToDisplay.push(bid);
					} else if (bid.speedrun === bidsToDisplay[bidsToDisplay.length - 1].speedrun) {
						bidsToDisplay.push(bid);
					}
				});

				// Loop over each bid and queue it up on the timeline
				bidsToDisplay.forEach(this.showBid, this);
			}

			this.tl.call(this.showCurrentPrizes, [], this, '+=0.1');
		},

		/**
		 * Adds an animation to the global timeline for showing a specific bid.
		 * Intended to be used as the callback of a "forEach" statement.
		 * @param {Object} bid - The bid to display.
		 * @param {Number} index - The index of this bid in bidsArray.
		 * @param {Array} bidsArray - The parent array containing all the bids being shown in this cycle.
		 * @returns {undefined}
		 */
		showBid(bid, index, bidsArray) {
			this.tl.set(this.$['challenge-bar-fill'], {width: 0});

			if (bid.type === 'challenge') {
				this.tl.call(() => {
					this.$['challenge-goal'].innerHTML = bid.goal;
				});
			} else if (bid.type === 'choice-binary') {
				this.tl.call(() => {
					this.$['tug-bar-center-label'].style.borderColor = 'white';
					this.$$('#tug-left .tug-option-total').innerHTML = bid.options[0].total;
					this.$$('#tug-right .tug-option-total').innerHTML = bid.options[1].total;
					this.$$('#tug-left .tug-option-desc').innerHTML = bid.options[0].description;
					this.$$('#tug-right .tug-option-desc').innerHTML = bid.options[1].description;
					this.$['tug-bar-left'].style.width = '50%';
					this.$['tug-bar-center-label-leftarrow'].style.display = 'none';
					this.$['tug-bar-center-label-rightarrow'].style.display = 'none';
					this.$['tug-bar-center-label-delta'].innerHTML = '$0';
				});
			}

			// Tween the height of the description area, if appropriate.
			if (index === 0 || bidsArray[index - 1].type !== bid.type) {
				this.tl.to(this.$.bidDescription, 0.333, {
					height: bid.type === 'challenge' ? 80 : 45,
					ease: Power2.easeInOut
				});
			}

			this.tl.call(() => {
				this.bidType = bid.type;
				this.runName = bid.speedrun;
			}, null, null, '+=0.1');

			this.tl.call(() => {
				this.bidDescription = bid.description;
			}, null, null, `+=${TYPE_INTERVAL}`);

			this.tl.fromTo(this.$.body, 0.333, {
				opacity: 0,
				y: -20
			}, {
				opacity: 1,
				y: 0,
				ease: Power1.easeOut,
				immediateRender: false
			});

			switch (bid.type) {
				case 'choice-binary': {
					this.tl.call(() => {
						this._typeAnim(this.$$('#tug-left .tug-option-desc'));
					}, null, null, `+=${TYPE_INTERVAL}`);

					this.tl.call(() => {
						this._typeAnim(this.$$('#tug-left .tug-option-total'));
					}, null, null, `+=${TYPE_INTERVAL}`);

					this.tl.call(() => {
						this._typeAnim(this.$$('#tug-right .tug-option-total'));
					}, null, null, `+=${TYPE_INTERVAL}`);

					this.tl.call(() => {
						this._typeAnim(this.$$('#tug-right .tug-option-desc'));
					}, null, null, `+=${TYPE_INTERVAL}`);

					const maxPips = CHALLENGE_BAR_WIDTH / BIG_PIP_WIDTH;
					let leftPips = Math.floor(maxPips * (bid.options[0].rawTotal / bid.rawTotal));
					leftPips = Math.min(leftPips, maxPips);
					let rightPips = Math.floor(maxPips * (bid.options[1].rawTotal / bid.rawTotal));
					rightPips = Math.min(rightPips, maxPips);
					const barDeltaDuration = Math.abs(leftPips - rightPips) * TUG_PIP_INTERVAL;

					// Only the left bar needs to be animated, right bar just takes remaining space.
					this.tl.add('barDelta', '+=0.4');
					this.tl.to(this.$['tug-bar-left'], barDeltaDuration, {
						width: leftPips * BIG_PIP_WIDTH,
						ease: Linear.easeNone
					}, 'barDelta');

					const deltaTweenProxy = {delta: 0};
					this.tl.to(deltaTweenProxy, barDeltaDuration, {
						onStart() {
							if (bid.options[0].rawTotal > bid.options[1].rawTotal) {
								this.$['tug-bar-center-label'].style.borderColor = '#ffaf31';
								this.$['tug-bar-center-label-leftarrow'].style.display = 'block';
							} else if (bid.options[0].rawTotal < bid.options[1].rawTotal) {
								this.$['tug-bar-center-label-rightarrow'].style.display = 'block';
								this.$['tug-bar-center-label'].style.borderColor = '#d778ff';
							}
						},
						onStartScope: this,
						delta: Math.abs(bid.options[0].rawTotal - bid.options[1].rawTotal),
						ease: Linear.easeNone,
						onUpdate() {
							this.$['tug-bar-center-label-delta'].textContent =
								deltaTweenProxy.delta.toLocaleString('en-US', {
									maximumFractionDigits: 2,
									style: 'currency',
									currency: 'USD'
								});
						},
						onUpdateScope: this
					}, 'barDelta');

					break;
				}

				case 'choice-many': {
					bid.options.forEach((option, index) => {
						if (index > 2) {
							return;
						}

						// this.tl.call(this.showMainLine2, [
						// 	`${index + 1}. ${option.description || option.name} - ${option.total}`
						// ], this, `+=${0.08 + (index * 4)}`);
					});

					break;
				}

				case 'challenge': {
					this.tl.call(() => {
						this._typeAnim(this.$['challenge-goal'], {splitType: 'chars'});
					}, null, null, `+=${TYPE_INTERVAL}`);

					const maxPips = CHALLENGE_BAR_WIDTH / BIG_PIP_WIDTH;
					let numPips = Math.floor(maxPips * (bid.rawTotal / bid.rawGoal));
					numPips = Math.min(numPips, maxPips);
					const barFillDuration = numPips * CHALLENGE_PIP_INTERVAL;

					this.tl.add('barFill', '+=0.4');
					this.tl.to(this.$['challenge-bar-fill'], barFillDuration, {
						width: numPips * BIG_PIP_WIDTH,
						modifiers: {
							width(width) {
								// Only increase width in increments of 6.
								width = parseInt(width, 10);
								return `${width - (width % 6)}px`;
							}
						},
						ease: Linear.easeNone
					}, 'barFill');

					const rawTotalTweenProxy = {rawTotal: 0};
					this.tl.to(rawTotalTweenProxy, barFillDuration, {
						rawTotal: bid.rawTotal,
						ease: Linear.easeNone,
						onUpdate() {
							this.$['challenge-bar-fill-label-text'].textContent =
								rawTotalTweenProxy.rawTotal.toLocaleString('en-US', {
									maximumFractionDigits: 0,
									style: 'currency',
									currency: 'USD'
								});
						},
						onUpdateScope: this
					}, 'barFill');

					break;
				}

				default: {
					const errorMsg = `Unexpected bid type "${bid.type}" (ID: ${bid.id})`;
					if (window.Rollbar) {
						window.Rollbar.error(errorMsg);
					}

					nodecg.log.error(errorMsg);
				}
			}

			// Give the bid some time to show
			this.tl.to({}, displayDuration, {});

			this.tl.to(this.$.body, 0.333, {
				opacity: 0,
				y: 15,
				ease: Power1.easeIn
			});
		},

		/**
		 * Adds an animation to the global timeline for showing the current prizes
		 * @returns {undefined}
		 */
		showCurrentPrizes() {
			const currentGrandPrizes = currentPrizes.value.filter(prize => prize.grand);
			const currentNormalPrizes = currentPrizes.value.filter(prize => !prize.grand);

			if (currentGrandPrizes.length > 0 || currentNormalPrizes.length > 0) {
				const prizesToDisplay = currentNormalPrizes.slice(0);
				this.tl.to({}, 0.3, {
					onStart: this.showLabel.bind(this),
					onStartParams: ['RAFFLE PRIZES', '21px']
				});

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
				const showPrize = this.showPrize.bind(this);
				prizesToDisplay.forEach(showPrize);
			}

			this.tl.call(this.showCurrentBids, [], this, '+=0.1');
		},

		/**
		 * Adds an animation to the global timeline for showing a specific prize.
		 * @param {Object} prize - The prize to display.
		 * @returns {undefined}
		 */
		showPrize(prize) {
			// GSAP is dumb with `call` sometimes. Putting this in a near-zero duration tween seems to be more reliable.
			this.tl.to({}, 0.01, {
				onComplete: function () {
					this.showMainLine1(`Provided by ${prize.provided}`);

					if (prize.grand) {
						this.showMainLine2(`Grand Prize: ${prize.description}`);
					} else {
						this.showMainLine2(prize.description);
					}
				}.bind(this)
			});

			// Give the prize some time to show
			this.tl.to({}, displayDuration, {});
		},

		formatRunName(runName) {
			if (!runName || typeof runName !== 'string') {
				return '?';
			}

			return runName.replace('\\n', '<br/>');
		},

		concatRunners(runners) {
			if (!runners || !Array.isArray(runners)) {
				return '?';
			}

			let concatenatedRunners;
			if (runners.length === 1) {
				concatenatedRunners = runners[0].name;
			} else {
				concatenatedRunners = runners.slice(1).reduce((prev, curr, index, array) => {
					if (index === array.length - 1) {
						return `${prev} & ${curr.name}`;
					}

					return `${prev}, ${curr.name}`;
				}, runners[0].name);
			}

			return concatenatedRunners;
		}
	});
})();
