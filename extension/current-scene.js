'use strict';

const app = require('express')();
const bodyParser = require('body-parser');

module.exports = function (nodecg) {
	const currentScene = nodecg.Replicant('currentScene', {defaultValue: ''});

	app.use(bodyParser.text());
	app.post('/agdq17-layouts/currentScene', (req, res) => {
		if (typeof req.body !== 'string') {
			return res.sendStatus(400);
		}

		currentScene.value = req.body.toLowerCase().replace(/ /g, '_');
		res.sendStatus(200);
	});

	nodecg.mount(app);
};
