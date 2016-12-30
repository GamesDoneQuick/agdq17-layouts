'use strict';

const OBSWebSocket = require('obs-websocket-js').OBSWebSocket;

module.exports = function (nodecg) {
	const currentScene = nodecg.Replicant('currentScene', {defaultValue: ''});
	currentScene.on('change', newVal => {
		nodecg.log.info(newVal);
	});

	if (!nodecg.bundleConfig.obsWebsocket) {
		nodecg.log.error('"obsWebsocket" is not defined in cfg/agdq17-layouts.json! ' +
			'OBS Studio integration will be disabled.');
		return {
			resetCropping() {}
		};
	}

	const ws = new OBSWebSocket();

	ws.onConnectionOpened = function () {
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
		nodecg.log.warn('[obs-websocket] Connection failed, retrying in 5 seconds.');
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
		ws.connect(nodecg.bundleConfig.obsWebsocket.url, nodecg.bundleConfig.obsWebsocket.password);
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
					currentScene.value = lowercaseSourceName.replace(/ /g, '_');
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
