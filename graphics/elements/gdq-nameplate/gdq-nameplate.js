(function () {
	'use strict';

	const NAME_FADE_DURATION = 0.33;
	const NAME_FADE_IN_EASE = Power1.easeOut;
	const NAME_FADE_OUT_EASE = Power1.easeIn;
	const currentRun = nodecg.Replicant('currentRun');
	const stopwatch = nodecg.Replicant('stopwatch');
	const gameAudioChannels = nodecg.Replicant('gameAudioChannels');

	Polymer({
		is: 'gdq-nameplate',

		properties: {
			index: Number,
			audio: {
				reflectToAttribute: true
			},
			attachLeft: {
				type: Boolean,
				reflectToAttribute: true,
				observer: 'attachLeftChanged'
			},
			attachRight: {
				type: Boolean,
				reflectToAttribute: true,
				observer: 'attachRightChanged'
			},
			coop: {
				type: Boolean,
				reflectToAttribute: true
			},
			forfeit: {
				type: Boolean,
				reflectToAttribute: true,
				value: false
			},
			time: String,
			place: Number,
			name: {
				type: String,
				value: ''
			},
			twitch: {
				type: String,
				value: ''
			},
			timeTL: {
				type: TimelineLite,
				value() {
					return new TimelineLite({autoRemoveChildren: true});
				},
				readOnly: true
			}
		},

		attachLeftChanged(newVal) {
			if (newVal && this.attachRight) {
				this.attachRight = false;
			}
		},

		attachRightChanged(newVal) {
			if (newVal && this.attachLeft) {
				this.attachLeft = false;
			}
		},

		showTime() {
			if (this._timeShowing) {
				return;
			}

			this._timeShowing = true;

			this.timeTL.clear();
			this.timeTL.call(() => {
				this.$.timeShine.style.width = '140%';
				if (this.attachRight) {
					this.$.timeClip.style.webkitClipPath = 'polygon(0 0, 140% 0%, calc(140% - 15px) 100%, 0% 100%)';
				} else {
					this.$.timeClip.style.webkitClipPath = 'polygon(-40% 0, 100% 0, 100% 100%, calc(-40% + 15px) 100%)';
				}
			});

			this.timeTL.set(this.$.timeShine, {transition: 'none', width: 0}, '+=1');
			this.timeTL.set(this.$.medal, {zIndex: 1});
			this.timeTL.set(this.$.timeShine, {transition: 'width 400ms linear', width: '140%', opacity: 0.5});
			this.timeTL.set(this.$.medal, {className: '+=shine'}, '+=0.25');
			this.timeTL.set(this.$.medal, {className: '-=shine'}, '+=0.35');
		},

		hideTime() {
			if (!this._timeShowing) {
				return;
			}

			this._timeShowing = false;

			this.timeTL.clear();
			this.timeTL.set(this.$.medal, {clearProps: 'zIndex'});
			this.timeTL.set(this.$.timeShine, {width: 0, clearProps: 'opacity', transition: 'width 325ms ease-in'});
			this.timeTL.set(this.$.timeClip, {
				clearProps: 'webkitClipPath',
				transition: '-webkit-clip-path 325ms ease-in'
			});
		},

		calcMedalImage(newVal, forfeit) {
			if (forfeit) {
				this.showTime();
				return '';
			}

			switch (newVal) {
				case 1:
					this.showTime();
					return 'components/gdq-nameplate/img/medal-gold.png';
				case 2:
					this.showTime();
					return 'components/gdq-nameplate/img/medal-silver.png';
				case 3:
					this.showTime();
					return 'components/gdq-nameplate/img/medal-bronze.png';
				case 4:
					this.showTime();
					return '';
				default:
					this.hideTime();
					return '';
			}
		},

		ready() {
			this.nameTL = new TimelineMax({repeat: -1, paused: true});
			this.nameTL.to(this.$.names, NAME_FADE_DURATION, {
				onStart: function () {
					this.$.namesTwitch.classList.remove('hidden');
					this.$.namesName.classList.add('hidden');
				}.bind(this),
				opacity: 1,
				ease: NAME_FADE_IN_EASE
			});
			this.nameTL.to(this.$.names, NAME_FADE_DURATION, {
				opacity: 0,
				ease: NAME_FADE_OUT_EASE
			}, '+=10');
			this.nameTL.to(this.$.names, NAME_FADE_DURATION, {
				onStart: function () {
					this.$.namesTwitch.classList.add('hidden');
					this.$.namesName.classList.remove('hidden');
				}.bind(this),
				opacity: 1,
				ease: NAME_FADE_IN_EASE
			});
			this.nameTL.to(this.$.names, NAME_FADE_DURATION, {
				opacity: 0,
				ease: NAME_FADE_OUT_EASE
			}, '+=80');

			currentRun.on('change', this.currentRunChanged.bind(this));
			stopwatch.on('change', this.stopwatchChanged.bind(this));
			gameAudioChannels.on('change', this.gameAudioChannelsChanged.bind(this));
		},

		/*
		 * 1) For singleplayer, if both match (ignoring capitalization), show only twitch.
		 * 2) For races, if everyone matches (ignoring capitalization), show only twitch, otherwise,
		 *    if even one person needs to show both, everyone shows both.
		 */
		currentRunChanged(newVal, oldVal) {
			// If nothing has changed, do nothing.
			if (oldVal && JSON.stringify(newVal.runners) === JSON.stringify(oldVal.runners)) {
				return;
			}

			this.coop = newVal.coop;

			let canConflateAllRunners = true;
			newVal.runners.forEach(runner => {
				if (runner) {
					if (!runner.stream || runner.name.toLowerCase() !== runner.stream.toLowerCase()) {
						canConflateAllRunners = false;
					}
				}
			});

			TweenLite.to(this.$.names, NAME_FADE_DURATION, {
				opacity: 0,
				ease: NAME_FADE_OUT_EASE,
				onComplete: function () {
					this.$.namesName.classList.add('hidden');
					this.$.namesTwitch.classList.remove('hidden');

					const runner = newVal.runners[this.index];
					if (runner) {
						this.name = runner.name;

						if (runner.stream) {
							this.twitch = runner.stream;
						} else {
							this.twitch = '';
						}
					} else {
						this.name = '?';
						this.twitch = '?';
					}

					if (!this.twitch) {
						this.nameTL.pause();
						this.$.namesName.classList.remove('hidden');
						this.$.namesTwitch.classList.add('hidden');
						TweenLite.to(this.$.names, NAME_FADE_DURATION, {opacity: 1, ease: NAME_FADE_IN_EASE});
					} else if (canConflateAllRunners) {
						this.nameTL.pause();
						TweenLite.to(this.$.names, NAME_FADE_DURATION, {opacity: 1, ease: NAME_FADE_IN_EASE});
					} else {
						this.nameTL.restart();
					}

					this.async(this.fitName);
				}.bind(this)
			});
		},

		fitName() {
			Polymer.dom.flush();
			const MAX_NAME_WIDTH = this.$.names.clientWidth - 32;
			const nameWidth = this.$.namesName.clientWidth;
			if (nameWidth > MAX_NAME_WIDTH) {
				TweenLite.set(this.$.namesName, {scaleX: MAX_NAME_WIDTH / nameWidth});
			} else {
				TweenLite.set(this.$.namesName, {scaleX: 1});
			}

			const MAX_TWITCH_WIDTH = MAX_NAME_WIDTH - 20;
			const twitchSpan = this.$.namesTwitch.querySelector('span');
			twitchSpan.style.width = 'auto';
			const twitchWidth = twitchSpan.clientWidth;
			if (twitchWidth > MAX_TWITCH_WIDTH) {
				const scale = MAX_TWITCH_WIDTH / twitchWidth;
				TweenLite.set(twitchSpan, {scaleX: scale, width: twitchWidth * scale});
			} else {
				TweenLite.set(twitchSpan, {scaleX: 1});
			}
		},

		stopwatchChanged(newVal) {
			if (newVal.results[this.index]) {
				this.forfeit = newVal.results[this.index].forfeit;
				this.place = newVal.results[this.index].place;
				this.time = newVal.results[this.index].formatted;
			} else {
				this.forfeit = false;
				this.place = 0;
			}
		},

		gameAudioChannelsChanged(newVal) {
			if (!newVal || newVal.length <= 0) {
				return;
			}

			const channels = newVal[this.index];
			const canHearSd = !channels.sd.muted && !channels.sd.fadedBelowThreshold;
			const canHearHd = !channels.hd.muted && !channels.hd.fadedBelowThreshold;
			this.audio = canHearSd || canHearHd;
		}
	});
})();
