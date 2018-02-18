var modbus = require('modbus-stream');
var async  = require('async');

var config = [
/*	{
		address: 40000,
		quantity: 1,
		type: 'Raw',
		name: 'S10 ModBus ID'
	},
	{
		address: 40003,
		quantity: 16,
		type: 'String',
		name: 'Hersteller'
	},
	{
		address: 40019,
		quantity: 16,
		type: 'String',
		name: 'Modell'
	},
	{
		address: 40035,
		quantity: 16,
		type: 'String',
		name: 'Seriennummer'
	},*/
	{
		address: 40067,
		quantity: 2,
		type: 'Int32',
		name: 'Photovoltaik-Leistung in Watt'
	},
	{
		address: 40069,
		quantity: 1,
		type: 'Int16',
		name: 'Batterie-Leistung in Watt (+/-)'
	},
	{
		address: 40071,
		quantity: 2,
		type: 'Int32',
		name: 'Hausverbrauchs-Leistung in Watt'
	},
	{
		address: 40073,
		quantity: 2,
		type: 'Int32',
		name: 'Leistung am Netzübergabepunkt in Watt (+/-)',
	},
	{
		address: 40081,
		quantity: 0.5,
		type: 'Uint8',
		name: 'Autarkie in Prozent'
	},
	{
		address: 40081.5,
		quantity: 0.5,
		type: 'Uint8',
		name: 'Eigenverbrauch in Prozent'
	},
	{
		address: 40082,
		quantity: 1,
		type: 'Uint16',
		name: 'Batterie-SOC in Prozent'
	},
	{
		address: 40101,
		quantity: 1,
		type: 'Uint16',
		name: 'String 1 in Watt'
	},
	{
		address: 40102,
		quantity: 1,
		type: 'Uint16',
		name: 'String 2 in Watt'
	},
/*	{
		address: 40095,
		quantity: 1,
		type: 'Uint16',
		name: 'String 1 in Volt'
	},
	{
		address: 40096,
		quantity: 1,
		type: 'Uint16',
		name: 'String 2 in Volt'
	},
	{
		address: 40098,
		quantity: 1,
		type: 'Uint16',
		name: 'String 1 in Ampere'
	},
	{
		address: 40099,
		quantity: 1,
		type: 'Uint16',
		name: 'String 2 in Ampere'
	},*/
/*	{
		address: 40066,
		quantity: 24,
		type: 'Raw',
		name: 'Debug'
	}*/
];

var e3dc;

modbus.tcp.connect(502, '10.0.3.11', { debug: null }, (err, connection) => {
	if (err) throw err;
	e3dc = connection;
	worker(e3dc);
});

var worker = function (connection) {
	var series = [];
	series.push((next) => { process.stdout.write('\x1B[2J\x1B[0f\u001b[0;0H'); return next(); });
	config.forEach(datapoint => {
		series.push((next) => {
			connection.readHoldingRegisters({ address: Math.floor(datapoint.address), quantity: Math.ceil(datapoint.quantity) }, (error, result) => {
				if (error) throw error;
				var all;
				if (datapoint.type == 'Int32') {
					result.response.data = result.response.data.reverse();
				}
				all = Buffer.concat(result.response.data);
				var value;
				switch (datapoint.type) {
					case 'Raw':
						value = all.toString('hex');
						break;
					case 'String':
						value = all.toString('ascii');
						break;
					case 'Uint8':
						var offset = (parseInt(datapoint.address) != datapoint.address && parseInt(datapoint.quantity) != datapoint.quantity) ? 1 : 0;
						value = all.readUInt8(offset);
						break;
					case 'Uint16':
						value = all.readUInt16BE(0);
						break;
					case 'Int16':
						value = all.readInt16BE(0);
						break;
					case 'Int32':
						value = all.readInt32BE(0);
						break;
					default:
						console.log('Error: unknown datapoint type: %s', datapoint.type);
						break;
				};
				console.log((datapoint.name + ':').padEnd(45, ' ') + value.toString().padStart(6, ' '));
				return next();
			});
		});
	});
	series.push((next) => { console.log('---------------------------------------------------');setTimeout(worker, 1000, e3dc); return next(); });
	async.series(series);
}
