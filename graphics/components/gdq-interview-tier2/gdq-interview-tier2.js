(function () {
	'use strict';

	const questions = nodecg.Replicant('interview:questionTweets');
	const questionSortMap = nodecg.Replicant('interview:questionSortMap');
	const questionShowing = nodecg.Replicant('interview:questionShowing');

	Polymer({
		is: 'gdq-interview-tier2',

		properties: {
			replies: {
				type: Object
			},
			onScreenTweet: {
				type: Object,
				computed: 'calcOnScreenTweet(replies, _sortMapVal)',
				observer: 'onScreenTweetChanged',
				value: null
			}
		},

		ready() {
			// Fades new question nodes from purple to white when added.
			Polymer.dom(this.$.list).observeNodes(mutation => {
				mutation.addedNodes.filter(node => {
					return node.classList && node.classList.contains('tweet');
				}).forEach(node => {
					const tweetMaterialNode = node.firstElementChild;
					flushCss(tweetMaterialNode);
					tweetMaterialNode.style.backgroundColor = 'white';
				});
			});

			questions.on('change', newVal => {
				this.replies = newVal.slice(0);
			});

			questionSortMap.on('change', (newVal, oldVal, operations) => {
				// If the new sortMap is equal to the currently rendered sort order, do nothing.
				if (JSON.stringify(newVal) === JSON.stringify(this._sortableListOrder)) {
					return;
				}

				this._sortMapVal = newVal.slice(0);

				this.$.repeat.render();

				if (this.$.list.items) {
					this.$.list.items.sort((a, b) => {
						const aMapIndex = newVal.indexOf(a.tweetId);
						const bMapIndex = newVal.indexOf(b.tweetId);

						// If neither of these replies are in the sort map, just leave them where they are.
						if (aMapIndex === 0 && bMapIndex === 0) {
							return 0;
						}

						return aMapIndex - bMapIndex;
					});
				}

				if (newVal.length > 0) {
					this._flashBgIfAppropriate(operations);
				}
			});

			questionShowing.on('change', newVal => {
				this._questionShowingVal = newVal;
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

			this.$.list.classList.remove('bg-color-transition');
			this.$.list.style.backgroundColor = '#9966cc';
			flushCss(this.$.list);
			this.$.list.classList.add('bg-color-transition');
			this.$.list.style.backgroundColor = 'transparent';
		},

		calcOnScreenTweet(replies, _sortMapVal) {
			return replies.find(reply => {
				return _sortMapVal.indexOf(reply.id_str) === 0;
			});
		},

		onScreenTweetChanged(newVal, oldVal) {
			if (newVal && oldVal && newVal.id_str === oldVal.id_str) {
				return;
			}

			this.$.onScreen.classList.remove('bg-color-transition');
			this.$.onScreen.style.backgroundColor = '#9966cc';
			flushCss(this.$.onScreen);
			this.$.onScreen.classList.add('bg-color-transition');
			this.$.onScreen.style.backgroundColor = '#ccffd2';
		},

		showQuestion() {
			questionShowing.value = true;
		},

		hideQuestion() {
			questionShowing.value = false;
		},

		openEndInterviewDialog() {
			this.$.endInterviewDialog.open();
		},

		showNextQuestion() {
			this.hideQuestion();
			nodecg.sendMessage('interview:markQuestionAsDone', this.onScreenTweet.id_str);
		},

		calcPromoteDisabled(tweet, _sortMapVal) {
			const sortIndex = _sortMapVal.indexOf(tweet.id_str);
			if (sortIndex === -1) {
				return false;
			}

			return sortIndex === 0;
		},

		calcDemoteDisabled(tweet, _sortMapVal) {
			const sortIndex = _sortMapVal.indexOf(tweet.id_str);
			if (sortIndex === -1) {
				return false;
			}

			return sortIndex >= _sortMapVal.length - 1;
		},

		_handleSortList() {
			let newSortOrder = this.$.list.items.map(item => item.tweetId);
			newSortOrder = questionSortMap.value.slice(0, 1).concat(newSortOrder);
			this._sortableListOrder = newSortOrder;
			questionSortMap.value = newSortOrder;
		},

		mapSort(a, b) {
			const aMapIndex = this._sortMapVal.indexOf(a.id_str);
			const bMapIndex = this._sortMapVal.indexOf(b.id_str);

			// If neither of these replies are in the sort map, just leave them where they are.
			if (aMapIndex === 0 && bMapIndex === 0) {
				return 0;
			}

			return aMapIndex - bMapIndex;
		},

		excludeFirstQuestion(questionTweet) {
			if (!this._sortMapVal) {
				return false;
			}

			return this._sortMapVal.indexOf(questionTweet.id_str) !== 0;
		}

		/* Disabled for now. Can't get drag sort and button sort to work simultaneously.
		 promote(e) {
		 nodecg.sendMessage('promoteQuestion', e.model.reply.id_str);
		 },

		 demote(e) {
		 nodecg.sendMessage('demoteQuestion', e.model.reply.id_str);
		 },
		 */
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
