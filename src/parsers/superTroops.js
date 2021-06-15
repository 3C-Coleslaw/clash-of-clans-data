const { writeFileSync, existsSync, mkdirSync } = require('fs');
const formatJson = require('json-format');

const RAW_CHARACTERS = require('../../raw/characters.json');
const RAW_SUPER_TROOPS = require('../../raw/super_licences.json');

const { getResourceName, getTextValue } = require('../utils');


function parseSuperTroops() {
	const output = [];

	for (const troop of RAW_SUPER_TROOPS) {
		if (troop.Name.toLowerCase() === 'string') continue;
		const superTID = RAW_CHARACTERS.find(raw => raw.Name === troop.Replacement)?.TID;
		const troopOriginal = RAW_CHARACTERS.find(raw => raw.Name === troop.Original);

		// NAME
		var nameKey1 = getTextValue(superTID);
		var nameKey2 = nameKey1.toLowerCase();
		const nameKey = nameKey2.replace(/ /g, "-");

		output.push({
			name: getTextValue(superTID),
			nameKey: nameKey,
			type: 'Super Troop',
			original: getTextValue(troopOriginal.TID),
			minOriginalLevel: troop.MinOriginalLevel + 1,
			village: troop.VillageType === 1
				? 'builderBase'
				: 'home',
			duration: troop.DurationH * 60 * 60,
			cooldown: troop.CooldownH * 60 * 60,
			resource: getResourceName(troop.Resource),
			resourceCost: troop.ResourceCost
		});
	}

	if (!existsSync('./output')) mkdirSync('./output');
	writeFileSync('./output/super-troops.json', formatJson(output, { type: 'space', size: 2 }));
}

module.exports = { run: parseSuperTroops };
