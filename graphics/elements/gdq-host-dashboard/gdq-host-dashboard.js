(function () {
	'use strict';

	const METROID_BID_PK = 5140;
	const EVENT_START_TIMESTAMP = 1483893000000;
	const total = nodecg.Replicant('total');
	const currentPrizes = nodecg.Replicant('currentPrizes');
	const allBids = nodecg.Replicant('allBids');
	const checklistComplete = nodecg.Replicant('checklistComplete');
	const stopwatch = nodecg.Replicant('stopwatch');
	const currentRun = nodecg.Replicant('currentRun');
	const schedule = nodecg.Replicant('schedule');

	Polymer({
		is: 'gdq-host-dashboard',

		properties: {
			currentTime: {
				type: String
			},
			elapsedTime: {
				type: String
			},
			total: {
				type: String
			},
			prizes: {
				type: Array
			},
			bids: {
				type: Array
			},
			saveTheAnimalsTotal: {
				type: Object
			},
			killTheAnimalsTotal: {
				type: Object
			},
			bidFilterString: {
				type: String,
				value: ''
			}
		},

		attached() {
			this.updateCurrentTime = this.updateCurrentTime.bind(this);
			this.updateCurrentTime();
			setInterval(this.updateCurrentTime, 1000);

			this.updateTimeElapsed = this.updateTimeElapsed.bind(this);
			this.updateTimeElapsed();
			setInterval(this.updateTimeElapsed, 1000);

			total.on('change', newVal => {
				this.total = newVal.formatted;
			});

			currentPrizes.on('change', newVal => {
				this.prizes = newVal.slice(0);
			});

			allBids.on('change', newVal => {
				this.bids = newVal.slice(0);
				this.metroidBid = newVal.find(bid => bid.pk === METROID_BID_PK);
			});

			checklistComplete.on('change', newVal => {
				if (newVal) {
					this.$.checklistStatus.style.backgroundColor = '#cfffcf';
					this.$.checklistStatus.innerText = 'READY TO START';
				} else {
					this.$.checklistStatus.style.backgroundColor = '#ffe2e2';
					this.$.checklistStatus.innerText = 'NOT READY YET';
				}
			});

			currentRun.on('change', newVal => {
				this.$['currentRun-name'].innerHTML = newVal.name.replace('\\n', '<br/>').trim();
				this.runners = newVal.runners.slice(0);
				this.recalcUpcomingRuns();
			});

			stopwatch.on('change', newVal => {
				this.stopwatchState = newVal.state;
				this.stopwatchTime = newVal.formatted;
				this.stopwatchResults = newVal.results.slice(0);
			});

			schedule.on('change', () => {
				this.recalcUpcomingRuns();
			});
		},

		recalcUpcomingRuns() {
			if (!schedule.value || !currentRun.value) {
				this.upcomingRuns = [];
				return;
			}

			this.upcomingRuns = schedule.value.slice(currentRun.value.order, currentRun.value.order + 3);
		},

		calcRunnersString(runners) {
			let concatenatedRunners;
			if (runners.length === 1) {
				concatenatedRunners = runners[0].name;
			} else {
				concatenatedRunners = runners.slice(1).reduce((prev, curr, index, array) => {
					if (index === array.length - 1) {
						return `${prev} & ${curr.name}`;
					}

					return `${prev}, ${curr.name}`;
				}, runners[0].name);
			}
			return concatenatedRunners;
		},

		updateCurrentTime() {
			const date = new Date();
			this.currentTime = date.toLocaleTimeString('en-US', {hour12: true});
		},

		updateTimeElapsed() {
			const nowTimestamp = Date.now();
			let millisecondsElapsed = nowTimestamp - EVENT_START_TIMESTAMP;
			let eventHasStarted = true;
			if (millisecondsElapsed < 0) {
				eventHasStarted = false;
				millisecondsElapsed = Math.abs(millisecondsElapsed);
			}

			const days = millisecondsElapsed / 8.64e7 | 0;
			const hours = parseInt((millisecondsElapsed / (1000 * 60 * 60)) % 24, 10);
			const minutes = parseInt((millisecondsElapsed / (1000 * 60)) % 60, 10);
			let timeString;

			if (eventHasStarted) {
				if (hours > 0) {
					timeString = `${hours} HOURS`;
				} else {
					timeString = `${minutes} MINUTES`;
				}

				timeString += ' ELAPSED';
			} else {
				timeString = 'SHOW STARTS IN ';
				if (days > 0) {
					timeString += `${days} DAYS, ${hours} HOURS & ${minutes} MINUTES`;
				} else if (hours > 0) {
					timeString += `${hours} HOURS & ${minutes} MINUTES`;
				} else {
					timeString += `${minutes} MINUTES`;
				}
			}

			this.elapsedTime = timeString;
		},

		calcMetroidAheadText(saveOrKill, saveTheAnimalsTotal, killTheAnimalsTotal) {
			if (saveOrKill === 'save') {
				if (saveTheAnimalsTotal.raw > killTheAnimalsTotal.raw) {
					return `Ahead by ${saveTheAnimalsTotal.raw - killTheAnimalsTotal.raw}`;
				} else if (killTheAnimalsTotal.raw > saveTheAnimalsTotal.raw) {
					return '---';
				}
				return 'TIED';
			} else if (saveOrKill === 'kill') {
				if (killTheAnimalsTotal.raw > saveTheAnimalsTotal.raw) {
					return `Ahead by ${saveTheAnimalsTotal.raw - killTheAnimalsTotal.raw}`;
				} else if (saveTheAnimalsTotal.raw > killTheAnimalsTotal.raw) {
					return '---';
				}
				return 'TIED';
			}

			throw new Error(`Unexpected calcAheadText first argument: "${saveOrKill}". Acceptable values are "save" and "kill".`);
		},

		calcBids(bids, bidFilterString) {
			const regexp = new RegExp(bidFilterString, 'i');
			return bids.filter(bid => {
				if (!bidFilterString) {
					return true;
				}

				return regexp.test(bid.description);
			});
		},

		calcRunnerName(runners, index) {
			if (index > this.runners.length - 1) {
				return '';
			} else {
				return this.runners[index].name;
			}
		},

		filterNull(item) {
			return item && item !== null;
		}
	});
})();
