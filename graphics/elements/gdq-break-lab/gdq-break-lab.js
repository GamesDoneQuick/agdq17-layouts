/* global SplitText */
(function () {
	'use strict';

	const TYPE_INTERVAL = 0.03;
	const NP_FADE_DURATION = 0.334;
	const TWEET_DISPLAY_DURATION = 9;
	const EMPTY_OBJ = {};
	const nowPlaying = nodecg.Replicant('nowPlaying');

	Polymer({
		is: 'gdq-break-lab',

		properties: {
			nowPlayingTL: {
				type: TimelineLite,
				value() {
					return new TimelineLite({autoRemoveChildren: true});
				},
				readOnly: true
			},
			tweetTL: {
				type: TimelineLite,
				value() {
					return new TimelineLite({autoRemoveChildren: true});
				},
				readOnly: true
			}
		},

		ready() {
			nowPlaying.on('change', this._nowPlayingChanged.bind(this));
			nodecg.listenFor('showTweet', this.showTweet.bind(this));
		},

		showTweet(tweet) {
			const tl = this.tweetTL;

			// Reset
			tl.call(() => {
				this.$['tweet-body-text'].innerText = '';
			});
			tl.set(this.$['tweet-body-text'], {opacity: 1});

			tl.add('transition');

			tl.to(this.$.nowplaying, NP_FADE_DURATION, {
				onStart() {
					this.$['tweet-name-text'].innerText = `@${tweet.user.screen_name}`;
				},
				onStartScope: this,
				opacity: 0,
				ease: Power1.easeIn
			}, 'transition');

			tl.to(this.$.bg, NP_FADE_DURATION * 1.5, {
				scaleY: 1,
				ease: Power2.easeInOut
			}, 'transition');

			tl.add('enter');

			tl.call(() => {
				this.$['tweet-body-text'].innerHTML = tweet.text;
				const splitTL = new TimelineLite();

				// eslint-disable-next-line no-new
				new SplitText(this.$['tweet-body-text'], {
					type: 'words,chars',
					charsClass: 'character style-scope gdq-break-lab'
				});

				const charsAndEmoji = Polymer.dom(this.$['tweet-body-text']).querySelectorAll('.character, .emoji');
				splitTL.staggerFrom(charsAndEmoji, 0.001, {
					visibility: 'hidden'
				}, TYPE_INTERVAL);
			}, null, null, 'enter');

			tl.to(this.$['tweet-name'], 0.446, {
				y: '0%',
				ease: Power2.easeOut
			}, 'enter');

			tl.add('exit', `+=${TWEET_DISPLAY_DURATION}`);

			tl.to(this.$['tweet-body-text'], NP_FADE_DURATION, {
				opacity: 0,
				ease: Power1.easeIn
			}, 'exit');

			tl.to(this.$['tweet-name'], 0.446, {
				y: '100%',
				ease: Power2.easeIn
			}, 'exit');

			tl.add('transition-out');

			tl.to(this.$.nowplaying, NP_FADE_DURATION, {
				opacity: 1,
				ease: Power1.easeOut
			}, 'transition-out');

			tl.to(this.$.bg, NP_FADE_DURATION * 1.5, {
				scaleY: 0.4468,
				ease: Power2.easeInOut
			}, 'transition-out');

			// Padding
			tl.to(EMPTY_OBJ, 0.1, EMPTY_OBJ);
		},

		_nowPlayingChanged(newVal) {
			const nowPlayingTL = this.nowPlayingTL;

			nowPlayingTL.to(this.$['nowplaying-text'], NP_FADE_DURATION, {
				opacity: 0,
				ease: Power1.easeIn,
				onComplete() {
					TweenMax.killTweensOf(this.$['nowplaying-game']);
					TweenMax.killTweensOf(this.$['nowplaying-title']);
					TweenLite.set([
						this.$['nowplaying-game'],
						this.$['nowplaying-title']
					], {x: 0});

					[{
						element: this.$['nowplaying-game'],
						scrollMultiplier: 1,
						newContent: newVal.game
					}, {
						element: this.$['nowplaying-title'],
						scrollMultiplier: 1.2,
						newContent: newVal.title
					}].forEach(({element, scrollMultiplier, newContent}) => {
						element.innerHTML = newContent || '?';
						if (element.scrollWidth > element.clientWidth) {
							Polymer.dom(element).innerHTML =
								`<div class="scroller">${newContent}&nbsp;&nbsp;&nbsp;&nbsp;</div>` +
								`<div class="scroller">${newContent}&nbsp;&nbsp;&nbsp;&nbsp;</div>`;
							Polymer.dom(element).flush();
							this.async(() => {
								const scrollerWidth = Polymer.dom(element).querySelector('.scroller').scrollWidth;
								const duration = scrollerWidth * scrollMultiplier;
								TweenMax.to(element, duration, {
									ease: Linear.easeNone,
									x: -scrollerWidth,
									useFrames: true,
									repeat: -1
								});
							}, 10);
						}
					});
				},
				onCompleteScope: this
			});

			nowPlayingTL.to(this.$['nowplaying-text'], NP_FADE_DURATION, {
				opacity: 1,
				ease: Power1.easeOut
			});
		}
	});
})();
