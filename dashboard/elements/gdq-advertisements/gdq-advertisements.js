(function () {
	'use strict';

	const advertisements = nodecg.Replicant('assets:advertisements');
	const adPageOpen = nodecg.Replicant('adPageOpen');
	const playingAd = nodecg.Replicant('playingAd');

	Polymer({
		is: 'gdq-advertisements',

		properties: {
			advertisements: Array,
			selectedBase: String,
			selectedAd: {
				type: Object,
				computed: 'computeSelectedAd(selectedBase)',
				value: null
			},
			playing: {
				type: Boolean,
				value: false
			},
			_playTimeout: {
				type: Number,
				value: null
			}
		},

		computeSelectedAd(selectedBase) {
			if (selectedBase && this.advertisements) {
				const selectedAd = this.advertisements.find(ad => ad.base === selectedBase);

				if (!selectedAd) {
					return null;
				}

				if (isVideo(selectedAd.ext)) {
					this.$.previewImage.setAttribute('hidden', 'true');
					this.$.previewVideo.removeAttribute('hidden');
					this.$.previewVideo.src = selectedAd.url;
				} else {
					this.$.previewImage.removeAttribute('hidden');
					this.$.previewVideo.setAttribute('hidden', 'true');
					this.$.previewImage.src = selectedAd.url;
				}
				return selectedAd;
			}

			return null;
		},

		ready() {
			adPageOpen.on('change', newVal => {
				if (newVal) {
					/* When the dashboard first loads, the layout might already be open and have all ads preloaded.
					 * Therefore, on first load we have to ask the layout what the status of all the ads is.
					 * This message will trigger the layout to send `adLoadProgress` or `adLoadFinished` events
					 * for all ads. */
					setTimeout(() => {
						nodecg.sendMessage('getLoadedAds');
					}, 100);
				} else {
					const adEls = Polymer.dom(this.root).querySelectorAll('.ad');
					adEls.forEach(adEl => {
						const progressEl = adEl.querySelector('paper-progress');
						progressEl.value = 0;
						progressEl.updateStyles();
						adEl.setAttribute('disabled', 'true');
					});

					this.selectedBase = -1;
				}
			});

			playingAd.on('change', newVal => {
				this.playing = newVal;
			});

			advertisements.on('change', newVal => {
				this.selectedBase = -1;
				this.advertisements = newVal.slice(0);
				setTimeout(() => {
					nodecg.sendMessage('getLoadedAds');
				}, 100);
			});

			nodecg.listenFor('adLoadProgress', data => {
				if (data.percentLoaded >= 100) {
					this.adLoaded(data.base);
				} else {
					const adEl = Polymer.dom(this.root).querySelector(`.ad[data-base="${data.base}"]`);
					if (adEl) {
						const progressEl = adEl.querySelector('paper-progress');
						progressEl.value = data.percentLoaded;
					}
				}
			});

			nodecg.listenFor('adLoaded', this.adLoaded.bind(this));
		},

		adLoaded(base) {
			const adEl = Polymer.dom(this.root).querySelector(`.ad[data-base="${base}"]`);
			if (adEl) {
				adEl.removeAttribute('disabled');
				const progressEl = adEl.querySelector('paper-progress');
				progressEl.value = 100;
				progressEl.updateStyles();
			}
		},

		calcPlayButtonDisabled(_playTimeout, selectedAd) {
			return _playTimeout || !selectedAd;
		},

		calcStatus(adState) {
			switch (adState) {
				case 'stopped':
					this.$.status.style.fontWeight = 'normal';
					return 'Not currently playing an ad.';
				case 'playing':
					this.$.status.style.fontWeight = 'bold';
					return 'An ad is in progress.';
				default:
					throw new Error(`Unexpected adState: "${adState}"`);
			}
		},

		calcAdIcon(ext) {
			return isVideo(ext) ? 'av:videocam' : 'image:photo';
		},

		calcAdTypeDisplay(ext) {
			if (!ext) {
				return '';
			}

			return isVideo(ext) ? 'Video' : 'Image';
		},

		play() {
			nodecg.sendMessage('playAd', this.selectedAd);
			this.$.play.querySelector('span').innerText = 'Starting playback...';
			this._playTimeout = setTimeout(() => {
				this._playTimeout = null;
				this.$.play.querySelector('span').innerText = 'Play Selected Ad';
			}, 1000);
		},

		stop() {
			nodecg.sendMessage('stopAd');
		},

		adSort(a, b) {
			if (a.base > b.base) {
				return 1;
			}

			if (b.base > a.base) {
				return -1;
			}

			return 0;
		}
	});

	/**
	 * Determines if a given file ext is a video.
	 * @param {String} ext - The ext to check.
	 * @returns {boolean} - Whether or not this is a video ext.
	 */
	function isVideo(ext) {
		return ext === '.mp4' || ext === '.webm';
	}
})();
