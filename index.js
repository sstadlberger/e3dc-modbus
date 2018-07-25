var modbus = require('modbus-stream');
var async = require('async');

var config = {
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
	'40067': {
		address: 40067,
		quantity: 2,
		type: 'Int32',
		name: 'Photovoltaik-Leistung',
		unit: 'W',
		last: ''
	},
	'40101': {
		address: 40101,
		quantity: 1,
		type: 'Uint16',
		name: 'String 1',
		unit: 'W',
		last: '',
		peak: 5130
	},
	'40102': {
		address: 40102,
		quantity: 1,
		type: 'Uint16',
		name: 'String 2',
		unit: 'W',
		last: '',
		peak: 4845
	},
	'40069': {
		address: 40069,
		quantity: 1,
		type: 'Int16',
		name: 'Batterie-Leistung (+/-)',
		unit: 'W',
		last: ''
	},
	'40082': {
		address: 40082,
		quantity: 1,
		type: 'Uint16',
		name: 'Batterie-SOC',
		unit: '%',
		last: '',
		capacity: 15.84
	},
	'40071': {
		address: 40071,
		quantity: 2,
		type: 'Int32',
		name: 'Hausverbrauchs-Leistung',
		unit: 'W',
		last: ''
	},
	'40077': {
		address: 40077,
		quantity: 2,
		type: 'Int32',
		name: 'Wallbox',
		unit: 'W',
		last: ''
	},
	'40073': {
		address: 40073,
		quantity: 2,
		type: 'Int32',
		name: 'Leistung am Netzübergabepunkt (+/-)',
		unit: 'W',
		last: ''
	},
	'40081': {
		address: 40081,
		quantity: 0.5,
		type: 'Uint8',
		name: 'Autarkie',
		unit: '%',
		last: ''
	},
	'40081.5': {
		address: 40081.5,
		quantity: 0.5,
		type: 'Uint8',
		name: 'Eigenverbrauch',
		unit: '%',
		last: ''
	},
	'40087': {
		address: 40087,
		quantity: 1,
		type: 'Binary',
		name: 'Wallbox Settings',
		unit: ''
	},
/*	'40088': {
		address: 40088,
		quantity: 1,
		type: 'Raw',
		name: 'WB1',
		unit: ''
	},
	'40089': {
		address: 40089,
		quantity: 1,
		type: 'Raw',
		name: 'WB2',
		unit: ''
	},
	'40090': {
		address: 40090,
		quantity: 1,
		type: 'Raw',
		name: 'WB3',
		unit: ''
	},
	'40091': {
		address: 40091,
		quantity: 1,
		type: 'Raw',
		name: 'WB4',
		unit: ''
	},
	'40092': {
		address: 40092,
		quantity: 1,
		type: 'Raw',
		name: 'WB5',
		unit: ''
	},
	'40093': {
		address: 40093,
		quantity: 1,
		type: 'Raw',
		name: 'WB6',
		unit: ''
	},
	'40094': {
		address: 40094,
		quantity: 1,
		type: 'Raw',
		name: 'WB7',
		unit: ''
	},*/
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
};

var e3dc;
var keys = Object.keys(config);
// custom sort order:
keys = ['40067', '40101', '40102', '40069', '40082', '40071', '40077', '40073', '40081', '40081.5', '40087'];


modbus.tcp.connect(502, '10.0.3.11', { debug: null }, (err, connection) => {
	if (err) throw err;
	e3dc = connection;
	worker(e3dc);
});

var worker = function (connection) {
	var series = [];
	series.push((next) => { process.stdout.write('\x1B[2J\x1B[0f\u001b[0;0H'); return next(); });
	keys.forEach(key => {
		series.push((next) => {
			var datapoint = config[key];
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
					case 'Binary':
						value = '';
						var hexString = all.toString('hex');
						var parts = hexString.match(/[\s\S]{1,2}/g) || [];
						parts.forEach(function(part) {
							value += hex2bin(part);
						});
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
				// some extra calculations
				var extra = ' ';
				switch (key) {
					case '40082':
						// Batterie in KWh
						extra += '(' + Math.round((datapoint.capacity * (value))) / 100 + ' kWh)';
						break;
					case '40067':
						// Wechselrichter Wirkungsgrad
						if (datapoint.last) {
							extra += '(' + parseInt((datapoint.last / (config['40101'].last + config['40102'].last)) * 100) + '%)';
						}
						break;
					case '40101':
					case '40102':
						// Strings Wirkungsgrad
						if (datapoint.last) {
							extra += '(' + parseInt((value / datapoint.peak) * 100) + '%)';
						}
						break;
					case '40087':
						// Wallbox settings
						var WBsettings = [
							[
								['Wallbox vorhanden und verfügbar', 'Wallbox vorhanden und verfügbar'],
								['Nein', 'Ja'],
								'R'
							],
							[
								['Solarbetrieb / Mischbetrieb', 'Solarbetrieb / Mischbetrieb'],
								['Mischbetrieb', 'Solarbetrieb'],
								'R/W'
							],
							[
								['Laden', 'Laden'],
								['freigegeben', 'abgebrochen'],
								'R/W'
							],
							[
								['Auto lädt nicht', 'Auto lädt'],
								['lädt nicht', 'lädt'],
								'R'
							],
							[
								['Typ-2-Stecker verriegelt', 'Typ-2-Stecker verriegelt'],
								['Nein', 'Ja'],
								'R'
							],
							[
								['Typ-2-Stecker gesteckt', 'Typ-2-Stecker gesteckt'],
								['Nein', 'Ja'],
								'R'
							],
							[
								['Schukosteckdose an', 'Schukosteckdose an'],
								['Nein', 'Ja'],
								'R/W'
							],
							[
								['Schukostecker gesteckt', 'Schukostecker gesteckt'],
								['Nein', 'Ja'],
								'R'
							],
							[
								['Schukostecker verriegelt', 'Schukostecker verriegelt'],
								['Nein', 'Ja'],
								'R'
							],
							[
								['Relais an, 16A, 1 Phase, Schukosteckdose', 'Relais an, 16A, 1 Phase, Schukosteckdose'],
								['Nein', 'Ja'],
								'R'
							],
							[
								['Relais an, 16A, 3 Phasen, Typ 2', 'Relais an, 16A, 3 Phasen, Typ 2'],
								['Nein', 'Ja'],
								'R'
							],
							[
								['Relais an, 32A, 3 Phasen, Typ 2', 'Relais an, 32A, 3 Phasen, Typ 2'],
								['Nein', 'Ja'],
								'R'
							],
							[
								['Drei Phasen aktiv', 'Eine Phase aktiv'],
								['3', '1'],
								'R/W'
							]
						];
						var bits = value.substring(3).split('').reverse();
						for (var i = 0; i < bits.length; i++) {
							printResult(WBsettings[i][0][Number(bits[i])], WBsettings[i][1][Number(bits[i])], '', ' (' + WBsettings[i][2] + ')');
						}
						break;
				}
				printResult(datapoint.name, value, datapoint.unit, extra);
				datapoint.last = value;
				return next();
			});
		});
	});
	series.push((next) => { setTimeout(worker, 1000, e3dc); return next(); });
	async.series(series);
}

var printResult = function (name, value, unit, extra) {
	console.log((name + ':').padEnd(42, ' ') + (value.toString() + unit).padStart(16, ' ') + extra);
}

var hex2bin = function (hex) {
    return ('00000000' + (parseInt(hex, 16)).toString(2)).substr(-8);
}
