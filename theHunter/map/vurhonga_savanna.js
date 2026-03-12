/* VURHONGA SAVANNA FULL AUDIT: 12 Trophies 
   Updated: 2026-03-12 
*/
const vurhongaTrophies = [
    { id: 'vur_arc', cat: 'DLC: Vurhonga Savanna', name: 'Vurhonga Savanna Arc', rank: 'silver', current: 0, goal: 1, type: 'toggle', desc: 'Complete all the Vurhonga Savanna Mission arcs.' },
    { id: 'vur_warden', cat: 'DLC: Vurhonga Savanna', name: 'Warden Missions Arc', rank: 'bronze', current: 0, goal: 10, type: 'checklist', desc: 'Complete the Warden Mission arcs.', subItems: [
        {name: "Welcome to Vurhonga", done: false}, {name: "Mind the Traps", done: false}, {name: "Across the Savanna", done: false}, {name: "Praise the Ancestors", done: false}, {name: "The History of All Tribes", done: false},
        {name: "Mucking for Science", done: false}, {name: "Mampara", done: false}, {name: "The Last Rhino", done: false}, {name: "Traffic Jam", done: false}, {name: "Observe and Report", done: false}
    ]},
    { id: 'vur_mboweni', cat: 'DLC: Vurhonga Savanna', name: 'Mboweni Arc', rank: 'bronze', current: 0, goal: 5, type: 'checklist', desc: "Complete Maria Mboweni's mission arc.", subItems: missionSet(5) },
    { id: 'vur_ospreay', cat: 'DLC: Vurhonga Savanna', name: 'Ospreay Arc', rank: 'bronze', current: 0, goal: 5, type: 'checklist', desc: "Complete Flip Ospreay's mission arc.", subItems: missionSet(5) },
    { id: 'vur_maritz', cat: 'DLC: Vurhonga Savanna', name: 'Maritz Arc', rank: 'bronze', current: 0, goal: 5, type: 'checklist', desc: "Complete Dana Maritz's mission arc.", subItems: missionSet(5) },
    { id: 'vur_brother', cat: 'DLC: Vurhonga Savanna', name: 'Brother Arc', rank: 'bronze', current: 0, goal: 5, type: 'checklist', desc: "Complete Brother's mission arc.", subItems: missionSet(5) },
    { id: 'vur_senior', cat: 'DLC: Vurhonga Savanna', name: 'An Experienced Senior Warden', rank: 'bronze', current: 0, goal: 1, type: 'toggle', desc: 'Harvest every animal species in Vurhonga Savanna.' },
    { id: 'vur_njabulo', cat: 'DLC: Vurhonga Savanna', name: "Njabulo's Sorrow", rank: 'bronze', current: 0, goal: 1, type: 'toggle', desc: 'Hidden Trophy: Find Rambolo, the last rhino.' },
    { id: 'vur_kudu', cat: 'DLC: Vurhonga Savanna', name: 'Camouflage', rank: 'bronze', current: 0, goal: 50, type: 'numeric', desc: 'Spot 50 lesser kudu.' },
    { id: 'vur_widow', cat: 'DLC: Vurhonga Savanna', name: 'A Match for the Widowmaker', rank: 'bronze', current: 0, goal: 1, type: 'toggle', desc: 'Harvest a cape buffalo downed by the King .470DB.' },
    { id: 'vur_spring', cat: 'DLC: Vurhonga Savanna', name: 'Springbok City', rank: 'bronze', current: 0, goal: 25, type: 'numeric', desc: 'Harvest 25 springbok.' },
    { id: 'vur_lion', cat: 'DLC: Vurhonga Savanna', name: 'The Lion of Vurhonga', rank: 'bronze', current: 0, goal: 1, type: 'toggle', desc: 'Harvest an animal in every subregion in Vurhonga Savanna.' }
];
