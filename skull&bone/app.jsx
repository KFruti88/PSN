import React, { useState, useEffect } from 'react';
import { 
  Anchor, 
  Shield, 
  Crosshair, 
  Zap, 
  Settings, 
  Plus, 
  Trash2, 
  Info,
  Ship,
  Wind,
  Heart,
  Droplets,
  Swords
} from 'lucide-react';

// Initial data seeded from your photos
const INITIAL_FLEET = [
  {
    id: 'guardian-barque',
    name: 'Guardian',
    type: 'Barque',
    level: 11,
    rank: 'Guardian',
    passive: 'Restores hull health over time and to nearby allies.',
    weapons: {
      bow: { name: "Naga's Call", type: 'Culverin', power: 91, icon: '🔥' },
      port: { name: 'Endless Requiem', type: 'Torpedo', power: 119, icon: '🚀' },
      starboard: { name: 'The Rotmouth', type: 'Culverin (Poison)', power: 119, icon: '🤢' },
      stern: { name: "Naga's Call", type: 'Culverin', power: 91, icon: '🔥' },
      aux: { name: 'Eye of Heaven', type: 'Mortar', power: 114, icon: '⚡' }
    },
    furniture: [
      { slot: 1, name: 'Scrapper Station', type: 'Major', bonus: 'Restores 8000 Hull on Crew Attack', icon: '🛠️' },
      { slot: 2, name: 'Compagnie Screens', type: 'Minor', bonus: '-20% AoE Damage Taken', icon: '🛡️' },
      { slot: 3, name: 'Bombard Menuiserie I', type: 'Minor', bonus: '+5% Repair Amount', icon: '🪵' },
      { slot: 4, name: 'Hubac Tuning Rack', type: 'Minor', bonus: '+14% Torpedo Range', icon: '⚙️' },
      { slot: 5, name: 'Float Collars', type: 'Minor', bonus: '+50% Buoy Duration (Inactive)', icon: '🎈' },
      { slot: 6, name: 'Locked', type: 'None', bonus: 'Requires Ship Upgrade 6', icon: '🔒' }
    ],
    armor: { name: "Black Prince", power: 400, icon: '🏰' }
  }
];

const FleetTracker = () => {
  const [fleet, setFleet] = useState(INITIAL_FLEET);
  const [activeShipId, setActiveShipId] = useState(INITIAL_FLEET[0].id);
  const [showAddModal, setShowAddModal] = useState(false);

  const activeShip = fleet.find(s => s.id === activeShipId) || fleet[0];

  // Helper to calculate total "Healing/Repair" bonus
  const calculateHealBonus = (ship) => {
    let bonus = 0;
    ship.furniture.forEach(f => {
      if (f.bonus.includes('Repair Amount')) {
        const value = parseInt(f.bonus.match(/\d+/)?.[0] || 0);
        bonus += value;
      }
    });
    return bonus;
  };

  const healBonus = calculateHealBonus(activeShip);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-amber-500/30">
      {/* Top Header - Sized for your 30px preference */}
      <header className="bg-slate-900/80 border-b border-amber-900/30 p-4 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Anchor className="text-amber-500 h-8 w-8" />
            <h1 className="text-[30px] font-black tracking-tighter text-amber-50 uppercase">
              Werewolf Fleet Manager
            </h1>
          </div>
          <div className="flex gap-4 items-center">
             <div className="hidden md:flex flex-col items-end">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-widest">Active Server</span>
                <span className="text-amber-500 font-mono text-sm">Gainesville_Main_1</span>
             </div>
             <button 
              onClick={() => setShowAddModal(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-amber-900/20"
            >
              <Plus size={18} /> Add Ship
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar - Fleet List */}
        <aside className="lg:col-span-3 space-y-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-2">The Fleet</h2>
          <div className="space-y-2">
            {fleet.map(ship => (
              <button
                key={ship.id}
                onClick={() => setActiveShipId(ship.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${
                  activeShipId === ship.id 
                  ? 'bg-amber-900/20 border-amber-500/50 text-amber-50 shadow-inner' 
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${activeShipId === ship.id ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-500'}`}>
                    <Ship size={20} />
                  </div>
                  <div>
                    <div className="font-bold">{ship.name}</div>
                    <div className="text-xs opacity-60">Rank {ship.level} {ship.type}</div>
                  </div>
                </div>
                <div className="text-xs font-mono opacity-40 group-hover:opacity-100">ID: {ship.id.split('-')[1]}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Dashboard Area */}
        <section className="lg:col-span-9 space-y-6">
          
          {/* Active Ship Header */}
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Ship size={200} />
            </div>
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-amber-500 mb-1">
                    <Shield size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">{activeShip.rank} Build</span>
                  </div>
                  <h2 className="text-4xl font-black text-white uppercase tracking-tight">{activeShip.name}</h2>
                  <p className="text-slate-400 max-w-md mt-2 text-[14px]">{activeShip.passive}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 grid grid-cols-2 gap-8 min-w-[200px]">
                  <div className="text-center">
                    <div className="text-slate-500 text-[10px] uppercase font-bold">Heal Power</div>
                    <div className="text-green-400 text-2xl font-black">+{healBonus}%</div>
                  </div>
                  <div className="text-center border-l border-slate-800 pl-8">
                    <div className="text-slate-500 text-[10px] uppercase font-bold">Total Rank</div>
                    <div className="text-amber-500 text-2xl font-black">{activeShip.level}</div>
                  </div>
                </div>
              </div>

              {/* Weapons Grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {Object.entries(activeShip.weapons).map(([slot, item]) => (
                  <div key={slot} className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl group hover:border-amber-500/50 transition-colors">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-3 flex justify-between items-center">
                      <span>{slot}</span>
                      <Crosshair size={12} className="opacity-30 group-hover:opacity-100 text-amber-500" />
                    </div>
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="font-bold text-white text-sm line-clamp-1">{item.name}</div>
                    <div className="text-[10px] text-slate-500">{item.type} (Pwr {item.power})</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Furniture & Armor Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Furniture Grid */}
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Settings size={16} /> Loadout Furniture
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {activeShip.furniture.map((f) => (
                  <div 
                    key={f.slot} 
                    className={`p-3 rounded-xl border ${f.name === 'Locked' ? 'bg-slate-950 border-slate-800 opacity-50' : 'bg-slate-950/40 border-slate-700/50 hover:bg-slate-800/50'} transition-all`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{f.icon}</span>
                      <div className="overflow-hidden">
                        <div className="text-[10px] font-bold text-amber-500 uppercase">Slot {f.slot}</div>
                        <div className="text-xs font-bold text-white truncate">{f.name}</div>
                        <div className="text-[9px] text-slate-500 truncate leading-tight mt-1">{f.bonus}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Armor & Inventory Overview */}
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Shield size={16} /> Primary Hull Armor
                </h3>
                <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-amber-900/20">
                  <div className="text-4xl">{activeShip.armor.icon}</div>
                  <div>
                    <div className="text-white font-black uppercase text-lg">{activeShip.armor.name}</div>
                    <div className="text-amber-500 font-mono text-sm">DEFENSE RATING: {activeShip.armor.power}</div>
                  </div>
                </div>
              </div>

              {/* Photo Upload Simulation Area */}
              <div className="bg-gradient-to-br from-amber-600/10 to-slate-900 rounded-3xl p-6 border border-amber-900/20 relative group cursor-pointer overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Plus size={16} /> Update via Photo
                  </h3>
                  <p className="text-xs text-slate-400">Drag and drop your latest ship screenshots here to auto-update build data.</p>
                </div>
                <div className="absolute bottom-[-10px] right-[-10px] opacity-20 transform rotate-12 group-hover:scale-110 transition-transform">
                  <Zap size={80} className="text-amber-500" />
                </div>
              </div>
            </div>

          </div>
        </section>
      </main>

      {/* Basic Footer */}
      <footer className="mt-12 p-8 border-t border-slate-900 bg-slate-950/50 text-center">
        <p className="text-slate-600 text-xs tracking-widest uppercase font-bold">
          Part of Werewolf Projects • Season 4: Ascent into Chaos
        </p>
      </footer>
    </div>
  );
};

export default FleetTracker;
