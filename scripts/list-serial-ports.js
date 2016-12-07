'use strict';

const SerialPort = require('serialport');
SerialPort.list((err, ports) => {
	if (err) {
		throw err;
	}

	ports.forEach((port, index) => {
		console.log('comName:', port.comName);
		console.log('pnpId:', port.pnpId);
		console.log('manufacturer:', port.manufacturer);

		if (index > 0 && index <= ports.length - 1) {
			console.log();
		}
	});
});
