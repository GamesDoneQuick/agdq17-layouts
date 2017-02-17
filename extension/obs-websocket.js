'use strict';

const OBSWebSocket = require('obs-websocket-js').OBSWebSocket;

module.exports = function (nodecg) {
	const currentScene = nodecg.Replicant('currentScene', {defaultValue: ''});

	// Start with a stub that we'll replace if we have all the config we need.
	module.exports.resetCropping = function (){};

	if (!nodecg.bundleConfig.obsWebsocket.address) {
		nodecg.log.error('"obsWebsocket" is not defined in cfg/agdq17-layouts.json! ' +
			'OBS Studio integration will be disabled.');
		return;
	}

	const ws = new OBSWebSocket();
	let notifiedConnectionFailed = false;

	ws.onConnectionOpened = function () {
		notifiedConnectionFailed = false;
		nodecg.log.info('[obs-websocket] Connected.');
	};

	ws.onAuthenticationSuccess = function () {
		nodecg.log.info('[obs-websocket] Authenticated.');
		getCurrentScene();
	};

	ws.onConnectionClosed = function () {
		nodecg.log.warn('[obs-websocket] Connection closed, attempting to reconnect in 5 seconds.');
		setTimeout(connectToOBS, 5000);
	};

	ws.onConnectionFailed = function () {
		if (!notifiedConnectionFailed) {
			notifiedConnectionFailed = true;
			nodecg.log.warn('[obs-websocket] Connection failed, will keep retrying every 5 seconds');
		}
		setTimeout(connectToOBS, 5000);
	};

	ws.onSceneSwitch = getCurrentScene;

	connectToOBS();

	/**
	 * Attemps to connect to OBS Studio via obs-websocket using the parameters
	 * defined in the bundle config.
	 * @returns {undefined}
	 */
	function connectToOBS() {
		ws.connect(nodecg.bundleConfig.obsWebsocket.address, nodecg.bundleConfig.obsWebsocket.password);
	}

	/**
	 * Gets the current scene info from OBS, and detemines what layout is active based
	 * on the sources present in that scene.
	 * @returns {undefined}
	 */
	function getCurrentScene() {
		ws.getCurrentScene((err, data) => {
			if (err) {
				nodecg.log.error(err);
				return;
			}

			data.sources.some(source => {
				const lowercaseSourceName = source.name.toLowerCase();
				if (lowercaseSourceName.indexOf('layout') === 0) {
					currentScene.value = lowercaseSourceName.replace(/ /g, '_').replace('layout_', '');
					return true;
				}

				return false;
			});
		});
	}

	module.exports.resetCropping = function () {
		ws._sendRequest('ResetCropping');
	};
};
