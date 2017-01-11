(function () {
	'use strict';

	Polymer({
		is: 'gdq-host-dashboard-bid',

		properties: {
			bid: {
				type: Object
			},
			failed: {
				type: Boolean,
				computed: 'computeFailed(closed, bid)',
				reflectToAttribute: true
			},
			closed: {
				type: Boolean,
				computed: 'computeClosed(bid)',
				reflectToAttribute: true
			}
		},

		computeFailed(closed, bid) {
			return closed && bid.rawTotal < bid.rawGoal;
		},

		computeClosed(bid) {
			return bid.state.toLowerCase() === 'closed';
		},

		bidIsChallenge(bid) {
			return bid.type === 'challenge';
		},

		limitOptions(options) {
			if (!options) {
				return [];
			}

			return options.slice(0, 3);
		},

		calcOptionMeterStyle(bid, option) {
			if (!option || !bid.options || bid.options.length <= 0) {
				return '';
			}

			const percent = Math.floor((option.rawTotal / bid.options[0].rawTotal) * 100);
			return `width: ${percent}%;`;
		},

		bidHasMoreThanThreeOptions(bid) {
			if (!bid.options) {
				return false;
			}

			return bid.options.length > 3;
		},

		calcNumAdditionalOptions(bid) {
			if (!bid.options) {
				return 0;
			}

			return bid.options.length - 3;
		},

		calcBidName(description) {
			return description.replace('||', ' -- ');
		}
	});
})();
