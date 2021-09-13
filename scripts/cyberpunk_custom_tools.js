Hooks.on('ready', () => {
    
    fetch('./scripts/data/tools.json')
        .then(response => response.json())
        .then(data => {
            console.log(data)
            for (const [key,value] of Object.entries(data) {
                CONFIG.DND5E.toolIds[key] = value;
            }
        })

});