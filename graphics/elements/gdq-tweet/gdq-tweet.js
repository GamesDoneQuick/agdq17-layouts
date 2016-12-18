(function () {
	'use strict';

	Polymer({
		is: 'gdq-tweet',

		properties: {
			tweet: {
				type: Object,
				observer: 'populateBody'
			},
			profileUrl: {
				type: String,
				computed: 'computeProfileUrl(tweet)'
			},
			tweetUrl: {
				type: String,
				computed: 'computeTweetUrl(profileUrl, tweet)'
			}
		},

		computeProfileUrl(tweet) {
			if (!tweet || !tweet.user) {
				return;
			}

			return `https://twitter.com/${tweet.user.screen_name}`;
		},

		computeTweetUrl(profileUrl, tweet) {
			return `${profileUrl}/status/${tweet.id_str}`;
		},

		populateBody() {
			if (!this.tweet) {
				return;
			}

			Polymer.dom(this.$.body).innerHTML = this.tweet.text;
		}
	});
})();
