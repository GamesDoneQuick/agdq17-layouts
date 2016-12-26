/* global SplitText */
(function () {
	'use strict';

	const displayDuration = nodecg.bundleConfig.displayDuration;
	const currentBids = nodecg.Replicant('currentBids');
	const TYPE_INTERVAL = 0.03;
	const CHALLENGE_BAR_WIDTH = 372;
	const CHALLENGE_PIP_INTERVAL = 0.03;
	const TUG_PIP_INTERVAL = 0.04;
	const CHOICE_BAR_WIDTH = 214;
	const CHOICE_PIP_INTERVAL = 0.03;
	const BIG_PIP_WIDTH = 6;
	const SMALL_PIP_WIDTH = 4;
	const EMPTY_OBJ = {};

	Polymer({
		is: 'gdq-break-bids',

		properties: {
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

		ready() {
			return;

			// CTA is the first thing we show, so we use this to start our loop
			this.showCurrentBids();
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
		},

		/**
		 * Adds an animation to the global timeline for showing all current bids.
		 * @returns {undefined}
		 */
		showCurrentBids() {
			if (currentBids.value.length > 0) {
				// Figure out what bids to display in this batch
				const bidsToDisplay = [];

				currentBids.value.forEach(bid => {
					// Don't show closed bids in the automatic rotation.
					if (bid.state.toLowerCase() === 'closed') {
						return;
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
			// Prep elements for animation
			if (bid.type === 'challenge') {
				this.tl.set(this.$['challenge-bar-fill'], {width: 0});
				this.tl.call(() => {
					this.$['challenge-goal'].innerHTML = bid.goal;
				});
			} else if (bid.type === 'choice-binary') {
				this.tl.set(this.$['tug-bar-left'], {clearProps: 'width'});
				this.tl.call(() => {
					this.$['tug-bar-center-label'].style.borderColor = 'white';
					this.$$('#tug-left .tug-option-total').innerHTML = bid.options[0].total;
					this.$$('#tug-right .tug-option-total').innerHTML = bid.options[1].total;
					this.$$('#tug-left .tug-option-desc').innerHTML = bid.options[0].description;
					this.$$('#tug-right .tug-option-desc').innerHTML = bid.options[1].description;
					this.$['tug-bar-center-label-leftarrow'].style.display = 'none';
					this.$['tug-bar-center-label-rightarrow'].style.display = 'none';
					this.$['tug-bar-center-label-delta'].innerHTML = '$0';
				});
			} else if (bid.type === 'choice-many') {
				this.tl.call(() => {
					const pd = Polymer.dom(this.$.choice);
					const qsa = Polymer.dom(this.$.choice).querySelectorAll.bind(pd);
					qsa('.choice-row-meter-fill').forEach(el => {
						el.style.width = 0;
					});
					qsa('.choice-row-label').forEach((el, index) => {
						el.innerHTML = bid.options[index].name;
					});
					qsa('.choice-row-amount').forEach((el, index) => {
						el.innerHTML = bid.options[index].total;
					});
				});
			}

			const newRunName = this.formatRunName(bid.speedrun);
			this.tl.call(() => {
				if (!this.$['runName-content'].textContent && !this.$['bidDescription-content'].textContent) {
					return;
				}

				this.tl.pause();

				let changingRunName = false;
				if (this.$['runName-content'].textContent !== newRunName && this.$['runName-content'].split) {
					changingRunName = true;
					this._untypeAnim(this.$['runName-content']).then(checkDone.bind(this));
				}

				if (this.$['bidDescription-content'].split) {
					this._untypeAnim(this.$['bidDescription-content']).then(checkDone.bind(this));
				}

				let counter = 0;
				function checkDone() {
					counter++;
					if (!changingRunName || counter >= 2) {
						this.tl.resume();
					}
				}
			});

			// Tween the height of the description area, if appropriate.
			const bidDescriptionHeight = bid.type === 'challenge' ? 80 : 45;
			if (index === 0) {
				this.tl.set(this.$.bidDescription, {
					height: bidDescriptionHeight
				});
			} else if (bidsArray[index - 1].type !== bid.type) {
				this.tl.to(this.$.bidDescription, 0.333, {
					height: bidDescriptionHeight,
					ease: Power2.easeInOut
				});
			}

			this.tl.call(() => {
				this.$['runName-content'].innerHTML = newRunName;
				this._typeAnim(this.$['runName-content']);
				this.bidType = bid.type;
			}, null, null, '+=0.1');

			this.tl.call(() => {
				let newDescription = bid.description;
				const parts = newDescription.split('||');
				if (parts.length >= 2) {
					newDescription = parts[1];
				}

				this.$['bidDescription-content'].innerHTML = newDescription;
				this._typeAnim(this.$['bidDescription-content'], {splitType: 'chars,words,lines'});
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
					const rows = Polymer.dom(this.$.choice).querySelectorAll('.choice-row');

					rows.forEach(row => {
						this.tl.call(() => {
							this._typeAnim(row.querySelector('.choice-row-label'));
						}, null, null, `+=${TYPE_INTERVAL}`);

						this.tl.call(() => {
							this._typeAnim(row.querySelector('.choice-row-amount'), {splitType: 'chars'});
						}, null, null, `+=${TYPE_INTERVAL}`);
					});

					const maxPips = CHOICE_BAR_WIDTH / SMALL_PIP_WIDTH;
					this.tl.add('barFills', '+=0.3');
					rows.forEach((row, index) => {
						const option = bid.options[index];
						let numPips = Math.floor(maxPips * (option.rawTotal / bid.options[0].rawTotal));
						numPips = Math.min(numPips, maxPips);
						const barFillDuration = numPips * CHOICE_PIP_INTERVAL;

						this.tl.to(row.querySelector('.choice-row-meter-fill'), barFillDuration, {
							width: numPips * SMALL_PIP_WIDTH,
							modifiers: {
								width(width) {
									// Only increase width in increments of 4px.
									width = parseInt(width, 10);
									return `${width - (width % SMALL_PIP_WIDTH)}px`;
								}
							},
							ease: Linear.easeNone
						}, index === 0 ? 'barFills' : `barFills+=${CHOICE_PIP_INTERVAL * 2 * index}`);
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
								// Only increase width in increments of 6px.
								width = parseInt(width, 10);
								return `${width - (width % BIG_PIP_WIDTH)}px`;
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

		formatRunName(runName) {
			if (!runName || typeof runName !== 'string') {
				return '?';
			}

			return runName.replace('\\n', ' ');
		}
	});
})();
