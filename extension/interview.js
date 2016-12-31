'use strict';

const fs = require('fs');

module.exports = function (nodecg) {
	if (!fs.existsSync('bundles/agdq17-layouts/firebase-credentials.json')) {
		nodecg.log.error('"firebase-credentials.json" was not found at nodecg/bundles/agdq17-layouts! ' +
			'The interview question system will be disabled.');
		return;
	}

	const firebase = require('firebase-admin');
	const serviceAccount = require('../firebase-credentials.json');
	firebase.initializeApp({
		credential: firebase.credential.cert(serviceAccount),
		databaseURL: 'https://lightning-round.firebaseio.com'
	});

	const database = firebase.database();

	const lowerthirdShowing = nodecg.Replicant('interview:lowerthirdShowing', {defaultValue: false, persistent: false});
	const lowerthirdPulsing = nodecg.Replicant('interview:lowerthirdPulsing', {defaultValue: false, persistent: false});
	const lowerthirdPulseTimeRemaining = nodecg.Replicant('interview:lowerthirdTimeRemaining', {
		defaultValue: 0,
		persistent: false
	});
	let timeout;
	let interval;
	nodecg.Replicant('interview:names', {defaultValue: [], persistent: false});

	lowerthirdShowing.on('change', newVal => {
		if (!newVal) {
			clearInterval(interval);
			clearTimeout(timeout);
			lowerthirdPulsing.value = false;
			lowerthirdPulseTimeRemaining.value = 0;
		}
	});

	nodecg.listenFor('pulseInterviewLowerthird', duration => {
		// Don't stack pulses
		if (lowerthirdPulsing.value) {
			return;
		}

		lowerthirdShowing.value = true;
		lowerthirdPulsing.value = true;
		lowerthirdPulseTimeRemaining.value = duration;

		// Count down lowerthirdPulseTimeRemaining
		interval = setInterval(() => {
			if (lowerthirdPulseTimeRemaining.value > 0) {
				lowerthirdPulseTimeRemaining.value--;
			} else {
				clearInterval(interval);
				lowerthirdPulseTimeRemaining.value = 0;
			}
		}, 1000);

		// End pulse after "duration" seconds
		timeout = setTimeout(() => {
			clearInterval(interval);
			lowerthirdShowing.value = false;
			lowerthirdPulsing.value = false;
		}, duration * 1000);
	});

	/* ---------------- */

	const questionSortMap = nodecg.Replicant('interview:questionSortMap');
	const questionTweetsRep = nodecg.Replicant('interview:questionTweets');
	const questionShowing = nodecg.Replicant('interview:questionShowing');

	questionSortMap.on('change', (newVal, oldVal) => {
		if (!oldVal || newVal[0] !== oldVal[0]) {
			questionShowing.value = false;
		}
	});

	let _repliesRef;
	let _repliesListener;
	database.ref('/active_tweet_id').on('value', snapshot => {
		if (_repliesRef && _repliesListener) {
			_repliesRef.off('value', _repliesListener);
		}

		const activeTweetID = snapshot.val();
		_repliesRef = database.ref(`/tweets/${activeTweetID}/replies`);
		_repliesListener = _repliesRef.on('value', snapshot => {
			const rawReplies = snapshot.val();
			const convertedAndFilteredReplies = [];
			for (const item in rawReplies) {
				if (!{}.hasOwnProperty.call(rawReplies, item)) {
					continue;
				}

				const reply = rawReplies[item];

				// Exclude tweets that somehow have no approval status yet.
				if (!reply.approval_status) {
					continue;
				}

				// Exclude any tweet that hasn't been approved by tier1.
				if (reply.approval_status.tier1 !== 'approved') {
					continue;
				}

				// Exclude tweets that have already been marked as "done" by tier2 (this app).
				if (reply.approval_status.tier2 === 'done') {
					continue;
				}

				convertedAndFilteredReplies.push(reply);
			}

			questionTweetsRep.value = convertedAndFilteredReplies;

			updateQuestionSortMap();
		});
	});

	nodecg.listenFor('interview:updateQuestionSortMap', updateQuestionSortMap);

	nodecg.listenFor('interview:markQuestionAsDone', id => {
		if (!_repliesRef) {
			return;
		}

		_repliesRef.child(id).transaction(tweet => {
			if (tweet) {
				if (!tweet.approval_status) {
					tweet.approval_status = {}; // eslint-disable-line camelcase
				}

				tweet.approval_status.tier2 = 'done';
			}

			return tweet;
		});
	});

	nodecg.listenFor('interview:end', () => {
		database.ref('/active_tweet_id').set(0);
	});

	/**
	 * Fixes up the sort map by adding and new IDs and removing deleted IDs.
	 * @returns {undefined}
	 */
	function updateQuestionSortMap() {
		// To the sort map, add the IDs of any new question tweets.
		questionTweetsRep.value.forEach(tweet => {
			if (questionSortMap.value.indexOf(tweet.id_str) < 0) {
				questionSortMap.value.push(tweet.id_str);
			}
		});

		// From the sort map, remove the IDs of any question tweets that were deleted or have been filtered out.
		for (let i = questionSortMap.value.length - 1; i >= 0; i--) {
			const result = questionTweetsRep.value.findIndex(tweet => tweet.id_str === questionSortMap.value[i]);
			if (result < 0) {
				questionSortMap.value.splice(i, 1);
			}
		}
	}

	/* Disabled for now. Can't get drag sort and button sort to work simultaneously.
	nodecg.listenFor('promoteQuestion', questionID => {
		const sortIndex = questionSortMap.value.indexOf(questionID);
		if (sortIndex <= 0) {
			throw new Error(`Tried to promote tweet with ID "${questionID}", but its sortIndex was "${sortIndex}"`);
		}
		questionSortMap.value.splice(sortIndex - 1, 0, questionSortMap.value.splice(sortIndex, 1)[0]);
	});

	nodecg.listenFor('demoteQuestion', questionID => {
		const sortIndex = questionSortMap.value.indexOf(questionID);
		if (sortIndex >= questionSortMap.value.length - 1) {
			throw new Error(`Tried to promote tweet with ID "${questionID}", but its sortIndex was "${sortIndex}"`);
		}
		questionSortMap.value.splice(sortIndex + 1, 0, questionSortMap.value.splice(sortIndex, 1)[0]);
	});
	*/
};
