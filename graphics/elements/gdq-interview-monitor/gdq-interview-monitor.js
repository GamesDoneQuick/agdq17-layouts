(function () {
	'use strict';

	const total = nodecg.Replicant('total');
	const currentRun = nodecg.Replicant('currentRun');
	const nextRun = nodecg.Replicant('nextRun');
	const currentScene = nodecg.Replicant('currentScene');
	const questionTweets = nodecg.Replicant('interview:questionTweets');
	const questionSortMap = nodecg.Replicant('interview:questionSortMap');

	Polymer({
		is: 'gdq-interview-monitor',

		properties: {
			questionTweets: {
				type: Array
			},
			noQuestionTweets: {
				type: Boolean,
				computed: 'computeNoQuestionTweets(questionTweets)'
			},
			onScreenTweet: {
				type: Object,
				computed: 'calcOnScreenTweet(questionTweets, _sortMapVal)',
				observer: 'onScreenTweetChanged',
				value: null
			}
		},

		computeNoQuestionTweets(questionTweets) {
			return !questionTweets || questionTweets.length <= 0;
		},

		calcOnScreenTweet(questionTweets, _sortMapVal) {
			return questionTweets.find(tweet => {
				return _sortMapVal.indexOf(tweet.id_str) === 0;
			});
		},

		onScreenTweetChanged(newVal, oldVal) {
			if (!newVal) {
				return;
			}

			if (newVal && oldVal && newVal.id_str === oldVal.id_str) {
				return;
			}

			this.$.repeat.render();
			Polymer.dom(this).flush();

			const firstMonitorTweet = this.$$('monitor-tweet');
			if (!firstMonitorTweet) {
				return;
			}

			firstMonitorTweet.$.material.style.transition = 'none';
			firstMonitorTweet.$.material.style.backgroundColor = '#9966cc';
			flushCss(firstMonitorTweet.$.material);
			firstMonitorTweet.$.material.style.transition = 'background-color 1600ms cubic-bezier(0.455, 0.03, 0.515, 0.955)';
			firstMonitorTweet.$.material.style.backgroundColor = '#ddffdd';
		},

		ready() {
			// Fades new question nodes from purple to white when added.
			Polymer.dom(this.$.tweetsColumn).observeNodes(mutation => {
				mutation.addedNodes.filter(node => {
					return node.is === 'monitor-tweet';
				}).forEach(node => {
					const isFirstChild = node === node.parentNode.querySelector('monitor-tweet');
					if (isFirstChild) {
						// This is handled by onScreenTweetChanged
						return;
					}

					flushCss(node);
					node.$.material.style.backgroundColor = 'white';
				});
			});

			this.tl = new TimelineLite({autoRemoveChildren: true});

			this.$['total-amount'].rawValue = 0;
			total.on('change', this.totalChanged.bind(this));

			this.updateUpNextDisplay = this.updateUpNextDisplay.bind(this);
			currentScene.on('change', this.updateUpNextDisplay);
			currentRun.on('change', this.updateUpNextDisplay);
			nextRun.on('change', this.updateUpNextDisplay);

			questionTweets.on('change', newVal => {
				if (!newVal || newVal.length === 0) {
					this.questionTweets = [];
					return;
				}

				this.questionTweets = newVal.slice(0);
			});

			questionSortMap.on('change', (newVal, oldVal, operations) => {
				this._sortMapVal = newVal.slice(0);
				this.$.repeat.render();

				if (newVal.length > 0) {
					this._flashBgIfAppropriate(operations);
				}
			});
		},

		_flashBgIfAppropriate(operations) {
			if (operations && operations.length === 1) {
				// Don't flash if the change was just the addition of a new question.
				if (operations[0].method === 'push') {
					return;
				}

				// Don't flash if the change was just caused by hitting "Show Next" on tier2.
				if (operations[0].method === 'splice' && operations[0].args.length === 2 &&
					operations[0].args[0] === 0 && operations[0].args[1] === 1) {
					return;
				}
			}

			this.$.tweetsColumn.classList.remove('bg-color-transition');
			this.$.tweetsColumn.style.backgroundColor = '#9966cc';
			flushCss(this.$.tweetsColumn);
			this.$.tweetsColumn.classList.add('bg-color-transition');
			this.$.tweetsColumn.style.backgroundColor = '#dedede';
		},

		updateUpNextDisplay() {
			let upNextRun = nextRun.value;

			if (currentScene.value === 'break' || currentScene.value === 'interview') {
				upNextRun = currentRun.value;
			}

			if (!upNextRun) {
				return;
			}

			this.upNextRunName = upNextRun.name.replace('\\n', ' ').trim();

			let concatenatedRunners;
			if (upNextRun.runners.length === 1) {
				concatenatedRunners = upNextRun.runners[0].name;
			} else {
				concatenatedRunners = upNextRun.runners.slice(1).reduce((prev, curr, index, array) => {
					if (index === array.length - 1) {
						return `${prev} &<br/>${curr.name}`;
					}

					return `${prev},<br/>${curr.name}`;
				}, upNextRun.runners[0].name);
			}
			this.$.nextRunners.innerHTML = concatenatedRunners;
		},

		totalChanged(newVal) {
			const TIME_PER_DOLLAR = 0.03;
			const delta = newVal.raw - this.$['total-amount'].rawValue;
			const duration = Math.min(delta * TIME_PER_DOLLAR, 5);
			TweenLite.to(this.$['total-amount'], duration, {
				rawValue: newVal.raw,
				ease: Power2.easeOut,
				onUpdate() {
					this.$['total-amount'].textContent = this.$['total-amount'].rawValue.toLocaleString('en-US', {
						maximumFractionDigits: 0
					});
				},
				onUpdateScope: this
			});
		},

		mapSort(a, b) {
			if (!this._sortMapVal) {
				return 0;
			}

			const aMapIndex = this._sortMapVal.indexOf(a.id_str);
			const bMapIndex = this._sortMapVal.indexOf(b.id_str);

			if (aMapIndex >= 0 && bMapIndex < 0) {
				return -1;
			}

			if (aMapIndex < 0 && bMapIndex >= 0) {
				return 1;
			}

			// If neither of these replies are in the sort map, just leave them where they are.
			if (aMapIndex < 0 && bMapIndex < 0) {
				return 0;
			}

			return aMapIndex - bMapIndex;
		}
	});

	/**
	 * By reading the offsetHeight property, we are forcing
	 * the browser to flush the pending CSS changes (which it
	 * does to ensure the value obtained is accurate).
	 * @param {Object} element - The element to force a CSS flush on.
	 * @returns {undefined}
	 */
	function flushCss(element) {
		element.offsetHeight; // eslint-disable-line no-unused-expressions
	}
})();
