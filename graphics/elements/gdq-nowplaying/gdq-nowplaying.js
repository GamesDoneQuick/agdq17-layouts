(function () {
	'use strict';

	const TITLE_EXTRA_WIDTH = 24;
	const MAX_TEXT_WIDTH = 600;

	Polymer({
		is: 'gdq-nowplaying',

		properties: {
			title: String,
			game: String
		},

		observers: [
			'_resizeContainers(title, game)'
		],

		ready() {
			const tl = new TimelineLite({autoRemoveChildren: true});
			const nowPlaying = nodecg.Replicant('nowPlaying');

			nodecg.Replicant('nowPlayingPulsing').on('change', newVal => {
				if (newVal) {
					tl.call(() => {
						this.title = nowPlaying.value.title;
						this.game = nowPlaying.value.game;
					}, null, this, '+=0.1');

					tl.add('enter');
					tl.to([this.$.musicNote, this.$.musicNoteShadow], 0.66, {
						x: '0%',
						ease: Power2.easeOut
					}, 'enter');
					tl.set([this.$.titleContainer, this.$.gameContainer], {visibility: 'visible'}, 'enter+=0.25');
					tl.to([this.$.titleContainer, this.$.gameContainer], 1.2, {
						x: '0%',
						ease: Power2.easeOut
					}, 'enter+=0.25');
				} else {
					tl.add('exit');
					tl.to([this.$.titleContainer, this.$.gameContainer], 1.2, {
						x: '-120%',
						ease: Power2.easeIn
					}, 'exit');
					tl.to([this.$.musicNote, this.$.musicNoteShadow], 0.66, {
						x: '-100%',
						ease: Power2.easeIn
					}, 'exit+=0.8');
					tl.set([this.$.titleContainer, this.$.gameContainer], {
						visibility: 'hidden',
						x: '-100%'
					}, 'exit+=1.2');
				}
			});
		},

		_resizeContainers() {
			Polymer.dom.flush();

			this.$.titleContainer.style.width = 'auto';

			[this.$.title, this.$.game].forEach(textNode => {
				textNode.style.width = 'auto';
				const textWidth = textNode.clientWidth;
				console.log(textNode, textWidth);
				if (textWidth > MAX_TEXT_WIDTH) {
					const scale = MAX_TEXT_WIDTH / textWidth;
					TweenLite.set(textNode, {scaleX: scale, width: textWidth * scale});
				} else {
					TweenLite.set(textNode, {scaleX: 1});
				}
			});

			const titleContainerWidth = this.$.titleContainer.getBoundingClientRect().width;
			const gameContainerWidth = this.$.gameContainer.getBoundingClientRect().width;
			if (titleContainerWidth < gameContainerWidth + TITLE_EXTRA_WIDTH) {
				this.$.titleContainer.style.width = `${gameContainerWidth + TITLE_EXTRA_WIDTH}px`;
			}
		}
	});
})();
