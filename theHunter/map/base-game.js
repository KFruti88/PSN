/* BASE GAME FULL AUDIT: 51 Trophies
   Updated: 2026-03-12
*/
const baseGameTrophies = [
    // Platinum
    { id: 'plat_cotw', cat: 'Base Game', name: 'theHunter', rank: 'platinum', current: 0, goal: 1, type: 'toggle', plat: false, desc: 'Collect every trophy.' },

    // Distance
    { id: 'the_mile', cat: 'Base Game', name: 'The Mile', rank: 'bronze', current: 0, goal: 1, type: 'numeric', plat: true, desc: 'Travel a distance of 1 mile (1.609 kilometers) on foot.' },
    { id: 'scand_mile', cat: 'Base Game', name: 'The Scandinavian Mile', rank: 'bronze', current: 0, goal: 6.2, type: 'numeric', plat: true, desc: 'Travel a distance of 6.2 miles (10 kilometers) on foot.' },
    { id: 'marathon', cat: 'Base Game', name: 'The Marathon', rank: 'silver', current: 0, goal: 26.2, type: 'numeric', plat: true, desc: 'Travel a distance of 26.2 miles (42.195 kilometers) on foot.' },
    { id: 'ultra', cat: 'Base Game', name: 'The Ultramarathon', rank: 'gold', current: 0, goal: 100, type: 'numeric', plat: true, desc: 'Travel a distance of 100 miles (160.934 kilometers) on foot.' },

    // Character Mission Arcs
    { id: 'jager', cat: 'Base Game', name: 'Jäger Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Gerlinde Jäger's mission arc.", subItems: missionSet(5) },
    { id: 'sommer', cat: 'Base Game', name: 'Sommer Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Robert Sommer's mission arc.", subItems: missionSet(5) },
    { id: 'bhandari', cat: 'Base Game', name: 'Bhandari Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Vinay Bhandari's mission arc.", subItems: missionSet(5) },
    { id: 'fleischer', cat: 'Base Game', name: 'Fleischer Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Albertina Fleischer's mission arc.", subItems: missionSet(5) },
    { id: 'tressler', cat: 'Base Game', name: 'Tressler Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Marwin Tressler's mission arc.", subItems: missionSet(5) },
    { id: 'hope', cat: 'Base Game', name: 'Hope Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Richard Hope's mission arc.", subItems: missionSet(5) },
    { id: 'trampfine', cat: 'Base Game', name: 'Trampfine Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Jonathan Trampfine's mission arc.", subItems: missionSet(5) },
    { id: 'vualez', cat: 'Base Game', name: 'Vualez Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Fiona Vualez's mission arc.", subItems: missionSet(5) },
    { id: 'connors', cat: 'Base Game', name: 'Connors Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Emily Connors's mission arc.", subItems: missionSet(5) },
    { id: 'beatty', cat: 'Base Game', name: 'Beatty Arc', rank: 'gold', current: 0, goal: 5, type: 'checklist', plat: true, desc: "Complete Paul Beatty's mission arc.", subItems: missionSet(5) },
    
    // Reserve Arcs
    { id: 'hir_master', cat: 'Base Game', name: 'Hirschfelden Arc', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Complete all Central Europe missions.' },
    { id: 'lay_master', cat: 'Base Game', name: 'Layton Lake District Arc', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Complete all Pacific Northwest missions.' },

    // Marksman
    { id: 'novice_m', cat: 'Base Game', name: 'Novice Marksman', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Hit an animal from 50+ meters (55+ yards).' },
    { id: 'skilled_m', cat: 'Base Game', name: 'Skilled Marksman', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Hit an animal from 100+ meters (110+ yards).' },
    { id: 'expert_m', cat: 'Base Game', name: 'Expert Marksman', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Hit an animal from 200+ meters (219+ yards).' },
    { id: 'legend_m', cat: 'Base Game', name: 'Legendary Marksman', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Hit an animal from 400+ meters (438+ yards).' },

    // Specific Harvests
    { id: 'moby_deer', cat: 'Base Game', name: 'Moby Deer', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Harvest an albino deer in Hirschfelden or Layton Lake.' },
    { id: 'hero_h', cat: 'Base Game', name: 'Hero Of Hirschfelden', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Harvest an animal in every subregion in Hirschfelden.' },
    { id: 'lord_l', cat: 'Base Game', name: 'Lord Of The Lakes', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Harvest an animal in every subregion in Layton Lake.' },

    // Tracker/Spotting
    { id: 'stay_target', cat: 'Base Game', name: 'Stay On Target', rank: 'bronze', current: 0, goal: 50, type: 'numeric', plat: true, desc: 'Find 50 tracks from the same animal.' },
    { id: 'persistence', cat: 'Base Game', name: 'Persistence Is Futile', rank: 'silver', current: 0, goal: 100, type: 'numeric', plat: true, desc: 'Find 100 tracks from the same animal.' },
    { id: 'stalker', cat: 'Base Game', name: 'Stalker', rank: 'silver', current: 0, goal: 100, type: 'numeric', plat: true, desc: 'Spot 100 animals.' },

    // Hidden Trophies
    { id: 'leave_no', cat: 'Base Game', name: 'Leave No Animal Behind', rank: 'bronze', current: 0, goal: 1, type: 'toggle', plat: true, desc: '*Hidden Trophy*' },
    { id: 'scarecrow', cat: 'Base Game', name: 'Scarecrow', rank: 'bronze', current: 0, goal: 1000, type: 'numeric', plat: true, desc: '*Hidden Trophy: Scare 1000 animals.*' },
    { id: 'not_zombie', cat: 'Base Game', name: 'This Is Not A Zombie Game', rank: 'silver', current: 0, goal: 10, type: 'numeric', plat: true, desc: '*Hidden Trophy: 10 brain hit kills.*' },

    // Ratings
    { id: 'diamonds_ever', cat: 'Base Game', name: 'Diamonds Are Forever', rank: 'gold', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Earn a diamond rating on a harvested animal.' },
    { id: 'goldmember', cat: 'Base Game', name: 'Goldmember', rank: 'silver', current: 0, goal: 1, type: 'toggle', plat: true, desc: 'Earn a gold rating on a harvested animal.' }
];
