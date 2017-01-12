(function () {
	'use strict';

	const total = nodecg.Replicant('total');
	const currentRun = nodecg.Replicant('currentRun');
	const nextRun = nodecg.Replicant('nextRun');
	const displayDuration = nodecg.bundleConfig.displayDuration;
	const currentBids = nodecg.Replicant('currentBids');
	const currentPrizes = nodecg.Replicant('currentPrizes');
	const currentScene = nodecg.Replicant('currentScene');

	Polymer({
		is: 'gdq-omnibar',

		properties: {
			state: {
				type: Object,
				value() {
					return {
						totalShowing: true,
						labelShowing: false
					};
				}
			},
			lastShownGrandPrize: {
				type: Object
			},
			_latestMainLine1: {
				type: Object,
				value() {
					return {};
				}
			},
			_latestMainLine2: {
				type: Object,
				value() {
					return {};
				}
			}
		},

		ready() {
			this.tl = new TimelineLite({autoRemoveChildren: true});

			// Play the shine animation every 2 minutes.
			setInterval(() => {
				this.$.gdqLogo.classList.add('animate');

				setTimeout(() => {
					this.$.gdqLogo.classList.remove('animate');
				}, 1000);
			}, 120 * 1000);

			this.$.totalTextAmount.rawValue = 0;
			total.on('change', this.totalChanged.bind(this));

			// CTA is the first thing we show, so we use this to start our loop
			this.showCTA();
		},

		totalChanged(newVal) {
			if (!this._totalInitialized) {
				this._totalInitialized = true;
				this.$.totalTextAmount.rawValue = newVal.raw;
				this.$.totalTextAmount.textContent = newVal.raw.toLocaleString('en-US', {
					maximumFractionDigits: 0
				});
				return;
			}

			const TIME_PER_DOLLAR = 0.03;
			const delta = newVal.raw - this.$.totalTextAmount.rawValue;
			const duration = Math.min(delta * TIME_PER_DOLLAR, 3);
			let strLen = this.$.totalTextAmount.textContent.length;
			TweenLite.to(this.$.totalTextAmount, duration, {
				rawValue: newVal.raw,
				ease: Power2.easeOut,
				onUpdate: function () {
					this.$.totalTextAmount.textContent = this.$.totalTextAmount.rawValue.toLocaleString('en-US', {
						maximumFractionDigits: 0
					});

					if (this.$.totalTextAmount.textContent.length !== strLen) {
						this.fitMainText();
						strLen = this.$.totalTextAmount.textContent.length;
					}
				}.bind(this)
			});
		},

		fitMainText() {
			const maxWidth = this.$.main.clientWidth;
			[this.$.mainLine1, this.$.mainLine2].forEach(element => {
				const elementWidth = element.clientWidth;
				if (elementWidth > maxWidth) {
					TweenLite.set(element, {scaleX: maxWidth / elementWidth});
				} else {
					TweenLite.set(element, {scaleX: 1});
				}
			});
		},

		/**
		 * Creates an animation timeline for showing the label.
		 * @param {String} text - The text to show.
		 * @param {String} size - The font size to use.
		 * @returns {TimelineLite} - An animation timeline.
		 */
		showLabel(text, size) {
			const tmpTL = new TimelineLite();
			if (this.state.labelShowing) {
				tmpTL.to(this.$.labelText, 0.25, {
					opacity: 0,
					ease: Power1.easeInOut,
					onComplete: function () {
						this.$.labelText.textContent = text;
						this.$.labelText.style.fontSize = size;
					}.bind(this)
				});

				tmpTL.to(this.$.labelText, 0.25, {
					opacity: 1,
					ease: Power1.easeInOut
				});
			} else {
				tmpTL.staggerTo([
					[this.$.labelRibbon3, this.$.labelShadow],
					this.$.labelRibbon2,
					this.$.labelRibbon1
				], 1.2, {
					onStart: function () {
						this.state.labelShowing = true;
						this.$.labelText.textContent = text;
						this.$.labelText.style.fontSize = size;
					}.bind(this),
					x: '0%',
					ease: Elastic.easeOut.config(0.5, 0.5)
				}, 0.08);

				tmpTL.to(this.$.labelText, 0.25, {
					opacity: 1,
					ease: Power1.easeInOut
				}, '-=0.4');
			}

			return tmpTL;
		},

		/**
		 * Creates an animation timeline for hiding the label.
		 * @returns {TimelineLite} - An animation timeline.
		 */
		hideLabel() {
			const tmpTL = new TimelineLite();

			if (this.state.labelShowing) {
				tmpTL.to(this.$.labelText, 0.25, {
					opacity: 0,
					ease: Power1.easeInOut
				});

				tmpTL.staggerTo([
					this.$.labelRibbon1,
					this.$.labelRibbon2,
					[this.$.labelRibbon3, this.$.labelShadow]
				], 0.7, {
					onStart: function () {
						this.state.labelShowing = false;
					}.bind(this),
					x: '-115%',
					ease: Back.easeIn.config(1.3)
				}, 0.08, '-=0.1');
			}

			return tmpTL;
		},

		/**
		 * Creates an animation timeline for showing mainLine1.
		 * @param {String} text - The text to show.
		 * @returns {TimelineLite|undefined} - An animation timeline.
		 */
		showMainLine1(text) {
			if (text === this._latestMainLine1.text) {
				return;
			}

			this._latestMainLine1.text = text;

			const tmpTL = new TimelineLite();

			if (this.$.mainLine1.textContent) {
				tmpTL.to(this.$.mainLine1, 0.5, {
					y: -24,
					ease: Power2.easeIn
				});

				// Delay for a bit
				tmpTL.to({}, 0.25, {});
			}

			tmpTL.call(() => {
				this.$.mainLine1.textContent = text;

				if (text) {
					TweenLite.set(this.$.mainLine1, {x: '-115%', y: '0%'});
					this.fitMainText();
				}
			}, null, null, '+=0.01');

			if (text) {
				tmpTL.to(this.$.mainLine1, 1.2, {
					x: '0%',
					ease: Power2.easeOut,
					autoRound: false
				});
			}

			return tmpTL;
		},

		/**
		 * Creates an animation timeline for showing mainLine2.
		 * @param {String} text - The text to show.
		 * @returns {TimelineLite|undefined} - An animation timeline.
		 */
		showMainLine2(text) {
			if (text === this._latestMainLine2.text) {
				return;
			}

			this._latestMainLine2.text = text;

			const tmpTL = new TimelineLite();

			if (this.$.mainLine2.textContent) {
				tmpTL.to(this.$.mainLine2, 0.5, {
					y: 50,
					ease: Power2.easeIn
				});

				// Delay for a bit
				tmpTL.to({}, 0.25, {});
			}

			tmpTL.call(() => {
				this.$.mainLine2.textContent = text;

				if (text) {
					TweenLite.set(this.$.mainLine2, {x: '-115%', y: '0%'});
					this.fitMainText();
				}
			}, null, null, '+=0.01');

			if (text) {
				tmpTL.to(this.$.mainLine2, 1.2, {
					x: '0%',
					ease: Power2.easeOut
				});
			}

			return tmpTL;
		},

		/**
		 * Adds an animation to the global timeline for showing the next upcoming speedrun.
		 * @returns {undefined}
		 */
		showUpNext() {
			let upNextRun = nextRun.value;

			if (currentScene.value === 'break' || currentScene.value === 'interview') {
				upNextRun = currentRun.value;
			}

			if (upNextRun) {
				this.tl.to({}, 0.3, {
					onStart: this.showLabel.bind(this),
					onStartParams: ['UP NEXT', '28px']
				});

				// GSAP is dumb with `call` sometimes. Putting this in a near-zero duration tween seems to be more reliable.
				this.tl.to({}, 0.01, {
					onComplete: function () {
						/* Depending on how we enter the very end of the schedule, we might end up in this func
						 * after window.nextRun has been set to null. In that case, we immediately clear the
						 * timeline and bail out to showing bids again.
						 */
						const upNextRun = (currentScene.value === 'break' || currentScene.value === 'interview') ?
							currentRun.value : nextRun.value;
						if (upNextRun) {
							let concatenatedRunners;
							if (upNextRun.runners.length === 1) {
								concatenatedRunners = upNextRun.runners[0].name;
							} else {
								concatenatedRunners = upNextRun.runners.slice(1).reduce((prev, curr, index, array) => {
									if (index === array.length - 1) {
										return `${prev} & ${curr.name}`;
									}

									return `${prev}, ${curr.name}`;
								}, upNextRun.runners[0].name);
							}

							this.showMainLine1(concatenatedRunners);
							this.showMainLine2(`${upNextRun.name.replace('\\n', ' ').trim()} - ${upNextRun.category}`);
						} else {
							this.tl.clear();

							this.tl.to({}, 0.3, {
								onStart: function () {
									this.showMainLine1('');
									this.showMainLine2('');
								}.bind(this),
								onComplete: this.showCurrentBids.bind(this)
							});
						}
					}.bind(this)
				});

				// Give it some time to show
				this.tl.to({}, displayDuration, {});
			}

			this.tl.to({}, 0.3, {
				onStart: function () {
					this.showMainLine1('');
					this.showMainLine2('');
				}.bind(this),
				onComplete: this.showCTA.bind(this)
			});
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
				const showBid = this.showBid.bind(this);
				bidsToDisplay.forEach(showBid);
			}

			this.tl.to({}, 0.3, {
				onStart: function () {
					this.showMainLine1('');
					this.showMainLine2('');
				}.bind(this),
				onComplete: this.showCurrentPrizes.bind(this)
			});
		},

		/**
		 * Adds an animation to the global timeline for showing a specific bid.
		 * @param {Object} bid - The bid to display.
		 * @returns {undefined}
		 */
		showBid(bid) {
			// GSAP is dumb with `call` sometimes. Putting this in a near-zero duration tween seems to be more reliable.
			this.tl.to({}, 0.01, {
				onComplete: this.showMainLine1.bind(this),
				onCompleteParams: [bid.description.replace('||', ' -- ')]
			});

			// If this is a donation war, show up to three options for it.
			// Else, it must be a normal incentive, so show its total amount raised and its goal.
			if (bid.options) {
				// If there are no options yet, display a message.
				if (bid.options.length === 0) {
					this.tl.call(this.showMainLine2, ['Be the first to bid!'], this);
				} else {
					bid.options.forEach((option, index) => {
						if (index > 2) {
							return;
						}

						this.tl.call(this.showMainLine2, [
							`${index + 1}. ${option.description || option.name} - ${option.total}`
						], this, `+=${0.08 + (index * 4)}`);
					});
				}
			} else {
				this.tl.call(this.showMainLine2, [`${bid.total} / ${bid.goal}`], this, '+=0.08');
			}

			// Give the bid some time to show
			this.tl.to({}, displayDuration, {});
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
					onStartParams: ['PRIZES', '32px']
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

			this.tl.to({}, 0.3, {
				onStart: function () {
					this.showMainLine1('');
					this.showMainLine2('');
				}.bind(this),
				onComplete: this.showUpNext.bind(this)
			});
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

		/**
		 * Adds an animation to the global timeline for showing the call-to-action.
		 * @returns {undefined}
		 */
		showCTA() {
			this.tl.call(this.hideLabel, null, this, '+=0.01');

			this.tl.set(this.$.cta, {y: '100%'});

			this.tl.to(this.$.cta, 0.55, {
				y: '0%',
				ease: Power2.easeOut
			}, '+=1');

			this.tl.to(this.$.cta, 0.8, {
				y: '-100%',
				ease: Power2.easeInOut
			}, `+=${displayDuration}`);

			this.tl.to(this.$.cta, 0.55, {
				y: '-200%',
				ease: Power2.easeIn
			}, `+=${displayDuration}`);

			this.tl.call(this.showCurrentBids, null, this, '+=0.3');
		}
	});
})();
