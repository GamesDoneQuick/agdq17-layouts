/* jshint -W106 */
(function () {
	'use strict';

	const tweetsContainer = document.getElementById('tweets');
	const tweets = nodecg.Replicant('tweets');
	const empty = document.getElementById('empty');
	const currentScene = nodecg.Replicant('currentScene');
	const cover = document.getElementById('cover');

	tweets.on('change', newVal => {
		empty.style.display = newVal.length > 0 ? 'none' : 'flex';

		// Remove existing tweets from div
		while (tweetsContainer.firstChild) {
			tweetsContainer.removeChild(tweetsContainer.firstChild);
		}

		const sortedTweets = newVal.slice(0);
		if (!sortedTweets) {
			return;
		}

		sortedTweets.sort((a, b) => {
			return new Date(b.created_at) - new Date(a.created_at);
		});

		sortedTweets.forEach(tweet => {
			const tweetItem = document.createElement('tweet-item');
			tweetItem.value = tweet;
			tweetsContainer.appendChild(tweetItem);
		});
	});

	currentScene.on('change', newVal => {
		switch (newVal) {
			case 'interview':
			case 'standard_4':
			case 'gameboy_4':
			case 'ds':
				cover.style.display = 'flex';
				break;
			default:
				cover.style.display = 'none';
		}
	});
})();
