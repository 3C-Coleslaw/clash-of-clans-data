const { writeFileSync, existsSync, mkdirSync } = require('fs');
const formatJson = require('json-format');

const RAW_CHARACTERS = require('../../raw/characters.json');
const RAW_SPELLS = require('../../raw/spells.json');
const RAW_HEROES = require('../../raw/heroes.json');
const RAW_PETS = require('../../raw/pets.json');
const RAW_BUILDINGS = require('../../raw/buildings.json');

const { getResourceName, getTextValue } = require('../utils');

const { maxTH, maxBH } = require('../../config.json');

const TYPES = {
	TROOPS: 0,
	SPELLS: 1,
	HEROES: 2,
	PETS: 3
};

function parseStats() {
	const troopsInfo = _parseStats(RAW_CHARACTERS, TYPES.TROOPS);
	const spellsInfo = _parseStats(RAW_SPELLS, TYPES.SPELLS);
	const heroesInfo = _parseStats(RAW_HEROES, TYPES.HEROES);
	const petsInfo = _parseStats(RAW_PETS, TYPES.PETS);

	const outputItems = [].concat(troopsInfo, spellsInfo, heroesInfo, petsInfo);

	if (!existsSync('./output')) mkdirSync('./output');
	writeFileSync('./output/troopStats.json', formatJson(outputItems, { type: 'space', size: 2 }));
}

function _parseStats(inputItems, type) {
	// temporary variables
	let validCharacter = { name: '', village: '' };
	let hallLevel = 1;

	// Every valid output character
	const outputList = [];

	for (let i = 1; i < inputItems.length; i++) {
		const character = inputItems[i];

		// soft exit for no name and no last character name
		if (character.Name === '' && validCharacter.name === '') {
			hallLevel = 1;
			continue;
		}

		// Ignoring all the disabled characters
		if (character.EnabledByCalendar === true || (type !== TYPES.PETS && character.DisableProduction === true) || character.EnabledBySuperLicence === true) {
			validCharacter.name = '';
			continue;
		}

		const village = character.VillageType === 1
			? 'builderBase'
			: 'home';

		const upgradeTime = formatUpdateTime(character.UpgradeTimeH, character.UpgradeTimeM);
		const upgradeCost = character.UpgradeCost === ''
			? null
			: parseInt(character.UpgradeCost);

		// NAME
		var nameKey1 = character.Name.toLowerCase();
		const nameKey = nameKey1.replace(/ /g, "-");

		// MAX LEVEL
		const maxLevel = character.TroopLevel === ''
		? null
		: parseInt(character.TroopLevel);

		// HOUSING SPACE
		const housingSpace = character.HousingSpace === ''
		? null
		: parseInt(character.HousingSpace);

		// SPEED
		const speed = character.Speed === ''
		? null
		: parseInt(character.Speed);

		// ATTACK SPEED
		const attackSpeed = character.AttackSpeed === ''
		? null
		: parseInt(character.AttackSpeed);

		// RANGE
		const range = character.AttackRange === ''
		? null
		: parseInt(character.AttackRange);

		// TRAINING TIME
		const trainingTime = character.TrainingTime === ''
		? null
		: parseInt(character.TrainingTime);

		// TRAINING COST
		const trainingCost = character.TrainingCost === ''
		? null
		: parseInt(character.TrainingCost);

		// SPECIAL ABILITY
		// const housingSpace = character.HousingSpace === ''
		// ? null
		// : parseInt(character.HousingSpace);

		// DPS
		const dpsValue = character.DPS === ''
		? null
		: parseInt(character.DPS);

		// HITPOINTS
		const hitpointsValue = character.Hitpoints === ''
		? null
		: parseInt(character.Hitpoints);

		// DAMAGE
		const damage = character.Damage === ''
		? null
		: parseInt(character.Damage);

		// RADIUS
		const radius = character.Radius === ''
		? null
		: parseInt(character.Radius);

		// LAB LEVELS
		const labLevel = character.LaboratoryLevel === ''
		? null
		: parseInt(character.LaboratoryLevel);

		// unlock values
		let unlockValues = {
			hall: null,
			cost: 0,
			time: 0,
			resource: '',
			building: '',
			buildingLevel: 0
		};

		// handling different character types
		if (type === TYPES.HEROES) {
			unlockValues.hall = hallLevel = character.RequiredTownHallLevel;
			const heroAltar = RAW_BUILDINGS.find(build => build.ExportName === `${heroAltars[character.TID]}1`);
			if (heroAltar) {
				unlockValues.cost = heroAltar.BuildCost;
				unlockValues.time = formatUnlockTime(heroAltar.BuildTimeD, heroAltar.BuildTimeH, heroAltar.BuildTimeM, heroAltar.BuildTimeS);
				unlockValues.resource = getResourceName(heroAltar.BuildResource);
				unlockValues.building = getTextValue(heroAltar.TID);
				unlockValues.buildingLevel = 1;
			}
		} else {
			const productionBuildingType = type === TYPES.SPELLS
				? 'SpellForgeLevel'
				: type === TYPES.PETS
					? 'LaboratoryLevel'
					: 'BarrackLevel';
			if (character.ProductionBuilding !== '' && character[productionBuildingType] !== '') {
				// some wiered fix.. because the pets file sucks
				const productionBuildingField = type === TYPES.PETS
					? 'Pet Shop'
					: character.ProductionBuilding;
				// Resetting hall level to 1 for new troop
				hallLevel = 1;
				const _build = RAW_BUILDINGS.find(build => build.ExportName === `${productionBuilding[productionBuildingField]}${character[productionBuildingType]}`);
				// unlock Values
				unlockValues.time = formatUnlockTime(_build.BuildTimeD, _build.BuildTimeH, _build.BuildTimeM, _build.BuildTimeS);
				unlockValues.cost = _build.BuildCost;
				const _buildLvl1 = RAW_BUILDINGS.find(build => build.ExportName === `${productionBuilding[productionBuildingField]}1`);
				unlockValues.resource = getResourceName(_buildLvl1.BuildResource);
				unlockValues.building = getTextValue(_buildLvl1.TID);
				unlockValues.hall = _build.TownHallLevel || _buildLvl1.TownHallLevel;
				unlockValues.buildingLevel = _build.BuildingLevel || _buildLvl1.BuildingLevel;
			}

			// Getting required TH level for current character level
			if (!isNaN(character.LaboratoryLevel)) {
				const labBuildName = type === TYPES.PETS
					? 'PetLab'
					: validCharacter.village === 'home'
						? 'Lab'
						: 'Lab2';
				const labThRequirement = RAW_BUILDINGS
					.find(build => build.ExportName === `${labBuilding[labBuildName]}${character.LaboratoryLevel}`).TownHallLevel;
				hallLevel = unlockValues.hall
					? Math.max(unlockValues.hall, hallLevel)
					: Math.max(hallLevel, labThRequirement);
			}
		}

		// Adding new character to the list
		if (character.Name) {
			validCharacter.name = character.Name;
			validCharacter.village = village;

			const category = type === TYPES.HEROES
				? 'hero'
				: type === TYPES.SPELLS
					? 'spell'
					: 'troop';
			const subCategory = [TYPES.TROOPS, TYPES.PETS].includes(type)
				? unlockValues.building === 'Workshop'
					? 'siege'
					: unlockValues.building === 'Pet House'
						? 'pet'
						: 'troop'
				: category;

			// Adding info
			outputList.push({
				_name: character.Name,
				name: getTextValue(character.TID),
				nameKey: nameKey,
				village,
				category,
				subCategory,
				unlock: unlockValues,
				maxLevel: maxLevel,
				upgrade: {
					cost: [upgradeCost],
					time: [upgradeTime],
					resource: getResourceName(character.UpgradeResource)
				},
				stats: {
					housingSpace: housingSpace,
					trainingTime: trainingTime,
					trainingCost: [trainingCost],
					speed: speed,
					attackSpeed: attackSpeed,
					range: range,
					dps: [dpsValue],
					hitpoints: [hitpointsValue],
					damage: [damage],
					radius: radius,
				},
				labLevels: [labLevel],
				hallLevels: [hallLevel]
			});
		} else {
			// Validating last indexed character
			if (validCharacter.name === '') continue;
			const foundItem = outputList.find(itm => itm._name === validCharacter.name && itm.village === validCharacter.village);
			if (!foundItem) continue;

			if (maxLevel > foundItem.maxLevel) foundItem.maxLevel = maxLevel;
			if (upgradeCost) foundItem.upgrade.cost.push(upgradeCost);
			if (upgradeTime) foundItem.upgrade.time.push(upgradeTime);
			if (trainingCost) foundItem.stats.trainingCost.push(trainingCost);
			if (dpsValue) foundItem.stats.dps.push(dpsValue);
			if (hitpointsValue) foundItem.stats.hitpoints.push(hitpointsValue);
			if (damage) foundItem.stats.damage.push(damage);
			foundItem.labLevels.push(labLevel);
			foundItem.hallLevels.push(hallLevel);
		}
	}

	const formattedOutput = outputList.map((itm) => {
		const levels = [];
		let previousLevel = 0;
		const maxHall = itm.village === 'home'
			? maxTH
			: maxBH;

		for (let i = 1; i <= Math.max(...itm.hallLevels, maxHall); i++) {
			const possibleLevel = itm.hallLevels.lastIndexOf(i);
			if (possibleLevel >= 0) {
				levels.push(possibleLevel + 1);
				previousLevel = possibleLevel + 1;
			} else {
				levels.push(previousLevel);
			}
		}
		delete itm.hallLevels;
		delete itm._name;
		itm.levels = levels;
		return itm;
	});

	return formattedOutput;
}

function formatUpdateTime(timeH, timeM) {
	const time = (isNaN(timeH)
		? 0
		: timeH * 60) + (isNaN(timeM)
		? 0
		: timeM);
	return time === 0
		? null
		: parseInt(time) * 60;
}

function formatUnlockTime(timeD, timeH, timeM, timeS) {
	return parseInt((isNaN(timeD)
		? 0
		: timeD * 24 * 60 * 60) + (isNaN(timeH)
		? 0
		: timeH * 60 * 60) + (isNaN(timeM)
		? 0
		: timeM * 60) + (isNaN(timeS)
		? 0
		: timeS));
}

const productionBuilding = {
	'Barrack': 'barracks_lvl',
	'Dark Elixir Barrack': 'darkBarracks_lvl',
	'Barrack2': 'adv_training_camp_lvl',
	'SiegeWorkshop': 'siegeWorkshop_lvl',
	'Spell Forge': 'spell_factory_lvl',
	'Mini Spell Factory': 'mini_spell_distillery_lvl',
	'Pet Shop': 'pet_house_lvl'
};

const labBuilding = {
	'Lab': 'laboratory_lvl',
	'Lab2': 'Telescope_lvl',
	'PetLab': 'pet_house_lvl'
};

const heroAltars = {
	'TID_BARBARIAN_KING': 'heroaltar_barbarian_king_lvl',
	'TID_ARCHER_QUEEN': 'heroaltar_archer_queen_lvl',
	'TID_WARMACHINE': 'heroaltar_warmachine_lvl',
	'TID_HERO_ROYAL_CHAMPION': 'heroaltar_royal_champion_lvl',
	'TID_GRAND_WARDEN': 'heroaltar_elder_lvl'
};

module.exports = { run: parseStats };
