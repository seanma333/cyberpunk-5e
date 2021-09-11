Hooks.on('renderActorSheet5eCharacter', (sheet, html) => {
    let removing = ['pp','gp','ep','sp']
    for (let p of Object.entries(removing)) {     
        html.find('.denomination.' + p).remove();
        html.find('[name="data.currency.' + p + '"]').remove();
    } 
    html.find('label.denomination.cp').text('Credit Points')
});

Hooks.on('renderTidy5eSheet', (sheet, html) => {
    let removing = ['pp','gp','ep','sp']
    for (let p of Object.entries(removing)) {     
        html.find('.denomination.' + p).parent().remove();
        html.find('.denomination.' + p).remove();
        html.find('[name="data.currency.' + p + '"]').remove();
    }
    html.find('label.denomination.cp').text('Credit Points')
});
Hooks.on('renderDNDBeyondCharacterSheet5e', (sheet, html) => {
    let removing = ['pp','gp','ep','sp']
    for (let p of Object.entries(removing)) {     
        html.find('.denomination.' + p).remove();
        html.find('[name="data.currency.' + p + '"]').remove();
    }
    html.find('label.denomination.cp').text('Credit Points')
});
Hooks.on('renderAlt5eSheet', (sheet, html) => {
    let removing = ['pp','gp','ep','sp']
    for (let p of Object.entries(removing)) {     
        html.find('.denomination.' + p).remove();
        html.find('[name="data.currency.' + p + '"]').remove();
    }
    html.find('label.denomination.cp').text('Credit Points')
});

Hooks.once('ready', () => {
    CONFIG.Actor.sheetClasses.character['dnd5e.ActorSheet5eCharacter'].cls.prototype._onConvertCurrency = _onMyConvertCurrency;
});

function _onMyConvertCurrency(event) {
    event.preventDefault();
    const curr = duplicate(this.actor.data.data.currency);
    console.log(curr);
    const convert = {
        sp: 10,
        ep: 50,
        gp: 100,
        pp: 1000
    };
    for (let [c, mult] of Object.entries(convert) ) {
        let change = Math.floor(curr[c] / t.each);
        converted = t * curr[c]
        curr['cp'] += converted;
        curr[c] = 0
    }
    return this.actor.update({"data.currency": curr});
 };