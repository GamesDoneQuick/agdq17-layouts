(function () {
	'use strict';

	const METROID_BID_ID = 5140;
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
			metroidBid: {
				type: Object,
				observer: 'metroidBidChanged'
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

		metroidBidChanged(newVal) {
			if (newVal) {
				const saveOpt = newVal.options.find(opt => opt.name.toLowerCase().indexOf('save') >= 0);
				const killOpt = newVal.options.find(opt => opt.name.toLowerCase().indexOf('kill') >= 0);
				this.saveTheAnimalsTotal = {
					formatted: saveOpt.total,
					raw: saveOpt.rawTotal
				};
				this.killTheAnimalsTotal = {
					formatted: killOpt.total,
					raw: killOpt.rawTotal
				};
			} else {
				this.saveTheAnimalsTotal = {
					formatted: '?',
					raw: 0
				};
				this.killTheAnimalsTotal = {
					formatted: '?',
					raw: 0
				};
			}

			if (this.saveTheAnimalsTotal > this.killTheAnimalsTotal) {
				this.$['metroid-save'].setAttribute('ahead', 'true');
				this.$['metroid-kill'].removeAttribute('ahead');
			} else {
				this.$['metroid-save'].removeAttribute('ahead');
				this.$['metroid-kill'].setAttribute('ahead', 'true');
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

				const metroidBid = newVal.find(bid => bid.id === METROID_BID_ID);
				if (metroidBid) {
					this.metroidBid = JSON.parse(JSON.stringify(metroidBid));
				} else {
					this.metroidBid = null;
				}
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

			nodecg.listenFor('bids:updating', () => {
				console.log('updating...');
				this.$['bids-cooldown'].indeterminate = true;
			});

			nodecg.listenFor('bids:updated', () => {
				console.log('updated!');

				const $cooldown = this.$['bids-cooldown'];
				$cooldown.indeterminate = false;
				$cooldown.classList.remove('transiting');
				$cooldown.value = 100;

				this.async(() => {
					$cooldown.classList.add('transiting');
					$cooldown.value = 0;
				}, 16.7 * 3);
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
			const diff = Math.abs(saveTheAnimalsTotal.raw - killTheAnimalsTotal.raw).toLocaleString('en-US', {
				maximumFractionDigits: 2,
				style: 'currency',
				currency: 'USD'
			});

			if (saveOrKill === 'save') {
				if (saveTheAnimalsTotal.raw > killTheAnimalsTotal.raw) {
					return `Ahead by ${diff}`;
				} else if (killTheAnimalsTotal.raw > saveTheAnimalsTotal.raw) {
					return '---';
				}
				return 'TIED';
			} else if (saveOrKill === 'kill') {
				if (killTheAnimalsTotal.raw > saveTheAnimalsTotal.raw) {
					return `Ahead by ${diff}`;
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
			}

			return this.runners[index].name;
		},

		isValidResult(result, index, runners) {
			return result && result !== null && runners[index] && runners[index].name;
		}
	});
})();
