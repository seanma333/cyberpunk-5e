Hooks.on('init', () => {
	weaponProps = {
		'automatic': 'Automatic',
		'foregrip': 'Foregrip',
		'mounted': 'Mounted',
		'scatter': 'Scatter',
		'strreq': 'Strength',
		'sighted': 'Sighted',
		'actionreload': 'Reload (Action)'
	}

	for (const [id, label] of Object.entries(weaponProps)) {
		CONFIG.DND5E.itemProperties[id] = {'label': label};
		CONFIG.DND5E.validProperties.weapon.add(id)
	}
});
