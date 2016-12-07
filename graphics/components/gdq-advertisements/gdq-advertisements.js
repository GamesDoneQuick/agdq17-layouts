(function () {
	'use strict';

	const FADE_DURATION = 0.5;
	const FADE_EASE = Power1.easeInOut;
	const IMAGE_AD_DURATION = 30;
	const loader = new createjs.LoadQueue();
	const playingAd = nodecg.Replicant('playingAd');
	const advertisements = nodecg.Replicant('assets:advertisements');
	const adPageOpen = nodecg.Replicant('adPageOpen');

	loader.on('fileprogress', e => {
		nodecg.sendMessage('adLoadProgress', {
			base: e.item.gdqBase,
			percentLoaded: e.loaded * 100
		});
	});

	loader.on('fileload', e => {
		console.log('[advertisements] Loaded', e.item.gdqBase);
		nodecg.sendMessage('adLoaded', e.item.gdqBase);
	});

	loader.on('complete', () => {
		console.log('[advertisements] All items loaded & ready for playback.');
	});

	window.loader = loader;

	Polymer({
		is: 'gdq-advertisements',

		ready() {
			this.tl = new TimelineLite({autoRemoveChildren: true});

			this.loadAd = this.loadAd.bind(this);
			this.removeAdImages = this.removeAdImages.bind(this);
			this.playingListener = this.playingListener.bind(this);
			this.endedListener = this.endedListener.bind(this);
			this.advertisementsChanged = this.advertisementsChanged.bind(this);

			advertisements.on('change', this.advertisementsChanged);
			adPageOpen.value = true;

			nodecg.listenFor('getLoadedAds', () => {
				loader.getItems().forEach(item => {
					if (item.result) {
						nodecg.sendMessage('adLoaded', item.item.gdqBase);
					}
				});
			});

			nodecg.listenFor('stopAd', this.stop.bind(this));

			// We assume that if we're hearing this message then the ad in question is fully preloaded.
			nodecg.listenFor('playAd', this.play.bind(this));
		},

		play(ad) {
			const result = loader.getResult(`ad-${ad.base}`);
			if (isVideo(ad.ext)) {
				if (result) {
					this.showAdVideo(result);
					nodecg.sendMessage('logAdPlay', ad);
				} else {
					throw new Error(`Tried to play ad but ad was not preloaded: ${ad.base}`);
				}
			} else {
				/* eslint-disable no-lonely-if */
				if (result) {
					this.showAdImage(result);
					nodecg.sendMessage('logAdPlay', ad);
				} else {
					throw new Error(`Tried to play ad but ad was not preloaded: ${ad.base}`);
				}
				/* eslint-enable no-lonely-if */
			}
		},

		stop() {
			playingAd.value = true;
			this.tl.clear();
			this.tl.to([this.currentImage, this.nextImage, this.$.black], FADE_DURATION, {
				opacity: 0,
				ease: FADE_EASE,
				onComplete: function () {
					this.removeAdImages();
					playingAd.value = false;
				}.bind(this)
			});
			this.removeAdVideo();
		},

		advertisementsChanged(newVal) {
			console.log('ADVERTISEMENTS CHANGED');

			let loadedItems = loader.getItems();
			// Load new items, re-load changed items.
			newVal.forEach(ad => {
				const existingItem = loadedItems.find(loadedItem => loadedItem.item.gdqSum === ad.sum);
				if (existingItem) {
					if (existingItem.item.gdqSum !== ad.sum) {
						console.log('[advertisements] Reloading %s', ad.base);
						loader.remove(`ad-${ad.base}`);
						this.loadAd(ad);
					}
				} else {
					this.loadAd(ad);
				}
			});

			// Remove deleted items.
			loadedItems = loader.getItems();
			loadedItems.forEach(loadedItem => {
				if (!newVal.find(ad => ad.sum === loadedItem.item.gdqSum)) {
					console.log('[advertisements] Removing %s', loadedItem.item.gdqBase);
					loader.remove(`ad-${loadedItem.item.gdqBase}`);
				}
			});
		},

		/**
		 * Loads an advertisement.
		 * @param {Object} ad - An ad descriptor object.
		 * @returns {undefined}
		 */
		loadAd(ad) {
			console.log('[advertisements] Loading %s', ad.base);
			const preloadType = isVideo(ad.ext) ? createjs.AbstractLoader.VIDEO : createjs.AbstractLoader.IMAGE;
			loader.loadFile({
				id: `ad-${ad.base}`,
				src: ad.url,
				gdqBase: ad.base,
				gdqSum: ad.sum,
				type: preloadType
			});
		},

		/**
		 * Shows an image advertisement.
		 * @param {HTMLElement} img - The next <img> tag to show.
		 * @returns {undefined}
		 */
		showAdImage(img) {
			// If the new ad is the same as the old one, do nothing.
			if (this.currentImage === img) {
				console.log('[advertisements] New img is identical to current image, aborting.');
				return;
			}

			// Clear any existing tweens. Advertisements ain't nothin' to fuck wit.
			this.tl.clear();
			this.removeAdVideo();
			this.tl.add('start');

			// If we already have a next image, ???
			if (this.nextImage) {
				throw new Error('[advertisements] We\'ve already got a next image queued up, you\'re screwed.');
			}

			// If there is an existing image being displayed, we need to crossfade to the new image.
			// Else, just fade the this.$.imageContainer in.
			if (this.currentImage) {
				this.nextImage = img;
				Polymer.dom(this.$.imageContainer).appendChild(this.nextImage);

				this.tl.to(this.nextImage, FADE_DURATION, {
					opacity: 1,
					ease: FADE_EASE,
					onComplete: function () {
						Polymer.dom(this.$.imageContainer).removeChild(this.currentImage);
						this.currentImage = this.nextImage;
						this.nextImage = null;
					}.bind(this)
				}, 'start');
			} else {
				this.currentImage = img;
				Polymer.dom(this.$.imageContainer).appendChild(this.currentImage);

				this.tl.to(this.currentImage, FADE_DURATION, {
					onStart: function () {
						this.currentImage.style.opacity = 1;
						playingAd.value = true;
					}.bind(this),
					opacity: 1,
					ease: FADE_EASE
				}, 'start');
			}

			// Fade out after IMAGE_AD_DURATION seconds.
			this.tl.to(this.currentImage, FADE_DURATION, {
				opacity: 0,
				ease: FADE_EASE,
				onComplete: function () {
					playingAd.value = false;
					this.removeAdImages();
				}.bind(this)
			}, `start+=${IMAGE_AD_DURATION + FADE_DURATION}`);
		},

		/**
		 * Removes all image ads from the DOM.
		 * @returns {undefined}
		 */
		removeAdImages() {
			if (this.currentImage) {
				this.$.imageContainer.removeChild(this.currentImage);
				this.currentImage = null;
			}

			if (this.nextImage) {
				this.$.imageContainer.removeChild(this.nextImage);
				this.nextImage = null;
			}
		},

		/**
		 * Shows a video advertisement.
		 * @param {HTMLElement} video - The <video> tag to play.
		 * @returns {undefined}
		 */
		showAdVideo(video) {
			video.removeEventListener('playing', this.playingListener);
			video.removeEventListener('ended', this.endedListener);

			this.removeAdVideo();
			this.removeAdImages();

			video.currentTime = 0;
			video.style.visibility = 'hidden';
			video.id = 'videoPlayer';

			TweenLite.to(this.$.black, 0.5, {
				opacity: 1,
				ease: Power1.easeIn,
				onComplete() {
					video.play();
				}
			});

			// The videos sometimes look at bit weird when they first start playing.
			// To polish things up a bit, we hide the video until the 'playing' event is fired.
			video.addEventListener('playing', this.playingListener);

			// When the video ends, remove it from the page.
			video.addEventListener('ended', this.endedListener);

			Polymer.dom(this.root).appendChild(video);
		},

		/**
		 * Removes all ad videos from the DOM.
		 * @returns {undefined}
		 */
		removeAdVideo() {
			while (this.$$('video')) {
				Polymer.dom(this.root).removeChild(this.$$('video'));
			}
		},

		/**
		 * Makes a video visible once it's started playing.
		 * @param {Object} e - Event.
		 * @returns {undefined}
		 */
		playingListener(e) {
			e.target.style.visibility = 'visible';
			e.target.removeEventListener('playing', this.playingListener);
			playingAd.value = true;
		},

		/**
		 * Removes a video element from the DOM once it's stopped playing.
		 * @param {Object} e - Event.
		 * @returns {undefined}
		 */
		endedListener(e) {
			TweenLite.to(this.$.black, 0.5, {
				opacity: 0,
				ease: Power1.easeOut
			});
			this.removeAdVideo();
			e.target.removeEventListener('ended', this.endedListener);
			playingAd.value = false;
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
