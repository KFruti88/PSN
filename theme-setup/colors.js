/* --- UPDATED GAME MAPPING --- */
const game = gameName.toLowerCase();
let mode = 'default-mode';

if (game.includes('doki doki') || game.includes('barbie') || game.includes('dreamhouse') || game.includes('princess')) {
    mode = 'pink-mode'; 
} else if (game.includes('dragon ball') || game.includes('seven deadly sins') || game.includes('jump force') || game.includes('bleach') || game.includes('tokyo ghoul') || game.includes('demon slayer') || game.includes('one punch man') || game.includes('naruto') || game.includes('anime')) {
    mode = 'anime-mode'; 
} else if (game.includes('doom') || game.includes('infamous') || game.includes('prototype') || game.includes('evil west') || game.includes('sifu') || game.includes('uncharted')) {
    mode = 'action-mode';
} else if (game.includes('dead by daylight') || game.includes('resident evil') || game.includes('evil dead') || game.includes('texas chain saw') || game.includes('vampyr') || game.includes('until dawn') || game.includes('akai') || game.includes('alan wake') || game.includes('the medium') || game.includes('beast inside') || game.includes('little nightmares') || game.includes('zombi')) {
    mode = 'horror-mode';
} else if (game.includes('batman') || game.includes('marvel') || game.includes('spider-man') || game.includes('avengers') || game.includes('guardians') || game.includes('gotham knights') || game.includes('suicide squad') || game.includes('injustice')) {
    mode = 'superhero-mode';
} else if (game.includes('tekken') || game.includes('mortal kombat') || game.includes('street fighter') || game.includes('multiversus') || game.includes('vf5') || game.includes('smite') || game.includes('ufc') || game.includes('tsushima')) {
    mode = 'fighting-mode';
} else if (game.includes('abzu') || game.includes('fishing') || game.includes('angler') || game.includes('surfing') || game.includes('underwater') || game.includes('fish')) {
    mode = 'water-mode';  
} else if (game.includes('stray') || game.includes('endling') || game.includes('maneater') || game.includes('spirit of the north') || game.includes('nature') || game.includes('lost ember')) {
    mode = 'nature-mode';
} else if (game.includes('hogwarts') || game.includes('harry potter') || game.includes('elden ring') || game.includes('hades') || game.includes('sekiro') || game.includes('nioh') || game.includes('tiny tina') || game.includes('blasphemous') || game.includes('god of war') || game.includes('black myth') || game.includes('wo long')) {
    mode = 'fantasy-mode';
} else if (game.includes('assassin') || game.includes('valhalla') || game.includes('hitman') || game.includes('dishonored')) {
    mode = 'stealth-mode';
} else if (game.includes('walking dead') || game.includes('world war z') || game.includes('zombie') || game.includes('dying light') || game.includes('days gone') || game.includes('back 4 blood')) {
    mode = 'zombie-mode';
} else if (game.includes('sonic')) {
    mode = 'sonic-mode'; 
} else if (game.includes('sea of thieves') || game.includes('skull and bones') || game.includes('black flag') || game.includes('pirate')) {
    mode = 'pirate-mode';
} else if (
    game.includes('need for speed') || game.includes('hot pursuit') || game.includes('police') || 
    game.includes('swat') || game.includes('enforcer') || game.includes('sheriff') || 
    game.includes('patrol') || game.includes('racing') || game.includes('forza') || game.includes('fast & furious')
) {
    mode = 'speed-mode';
} else if (game.includes('farming') || game.includes('simulator') || game.includes('stardew') || game.includes('harvest') || game.includes('tractor')) {
    mode = 'farming-mode'; // Forest Green / Harvest Gold
}

/* --- GHOSTLY OVERRIDE --- */
if (game.includes('ghost')) {
    document.body.classList.add('ghostly-pulse');
} else {
    document.body.classList.remove('ghostly-pulse');
}

// Final assignment
document.body.className = mode;

/* --- DYNAMIC THEME COLORS --- */
if (mode === 'farming-mode') {
    document.body.style.background = 'linear-gradient(180deg, #1b5e20 0%, #3e2723 100%)'; // Green to Brown
    const boxes = document.querySelectorAll('#wp-custom-wrapper, .game-card');
    boxes.forEach(box => {
        box.style.border = '2px solid #8bc34a'; // Lime Glow
        box.style.boxShadow = '0 0 15px #8bc34a';
    });
}
