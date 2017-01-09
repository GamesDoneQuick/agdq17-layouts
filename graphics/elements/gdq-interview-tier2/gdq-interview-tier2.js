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
				this.$.repeat.render();
			});

			questionSortMap.on('change', (newVal, oldVal, operations) => {
				// If the new sortMap is equal to the currently rendered sort order, do nothing.
				if (JSON.stringify(newVal.slice(1)) === JSON.stringify(this._sortableListOrder)) {
					return;
				}

				this._sortMapVal = newVal.slice(0);
				this.$.repeat.render();

				if (this.$.list.items) {
					this.$.list.items.sort((a, b) => {
						const aMapIndex = newVal.indexOf(a.id_str);
						const bMapIndex = newVal.indexOf(b.id_str);

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
					});
				}

				if (newVal.length > 0) {
					this._flashBgIfAppropriate(operations);
				}

				if (!this._sortableListOrder) {
					this._sortableListOrder = newVal.slice(0);
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

		calcListReplies(replies, _sortMapVal) {
			if (!_sortMapVal) {
				return [];
			}

			return replies.filter(reply => {
				return _sortMapVal.indexOf(reply.id_str) !== 0;
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

		endInterview() {
			nodecg.sendMessage('interview:end');
		},

		showNextQuestion() {
			this.hideQuestion();
			this.$.showNext.disabled = true;
			nodecg.sendMessage('interview:markQuestionAsDone', this.onScreenTweet.id_str, error => {
				this.$.showNext.disabled = false;
				if (error) {
					this.$.errorToast.text = 'Failed to load next interview question.';
					this.$.errorToast.show();
				}
			});
		},

		_handleSortList() {
			const newSortOrder = this.$.list.items.map(item => item.tweetId);
			this._sortableListOrder = newSortOrder;
			this.$.repeat._instances.sort((a, b) => {
				const aMapIndex = newSortOrder.indexOf(a.__data__.reply.id_str);
				const bMapIndex = newSortOrder.indexOf(b.__data__.reply.id_str);

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
			});
			questionSortMap.value = questionSortMap.value.slice(0, 1).concat(newSortOrder);
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

		/* Disabled for now. Can't get drag sort and button sort to work simultaneously.
		calcPromoteDisabled(tweet, _sortableListOrder) {
			const sortIndex = _sortableListOrder.indexOf(tweet.id_str);
			if (sortIndex === -1) {
				return false;
			}

			return sortIndex <= 1;
		},

		calcDemoteDisabled(tweet, _sortableListOrder) {
			const sortIndex = _sortableListOrder.indexOf(tweet.id_str);
			if (sortIndex === -1) {
				return false;
			}

			return sortIndex >= _sortableListOrder.length - 1;
		},

		promote(e) {
			nodecg.sendMessage('promoteQuestion', e.model.reply.id_str);
		},

		demote(e) {
			nodecg.sendMessage('demoteQuestion', e.model.reply.id_str);
		}
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
