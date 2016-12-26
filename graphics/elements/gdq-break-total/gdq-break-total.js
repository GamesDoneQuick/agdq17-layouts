(function () {
	'use strict';

	const total = nodecg.Replicant('total');

	Polymer({
		is: 'gdq-break-total',

		ready() {
			this.$['total-amount'].rawValue = 0;
			total.on('change', this.totalChanged.bind(this));
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
		}
	});
})();
