import React, { useState } from 'react';
import { 
  Anchor, 
  Shield, 
  Crosshair, 
  Zap, 
  Settings, 
  Plus, 
  Ship,
  Swords,
  Activity
} from 'lucide-react';

// Initial data seeded from your photos
const INITIAL_FLEET = [
  {
    id: 'guardian-barque',
    name: 'Guardian',
    type: 'Barque',
    level: 11,
    rank: 'Guardian',
    status: 'At Sea',
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

export default function App() {
  const [fleet, setFleet] = useState(INITIAL_FLEET);
  const [activeShipId, setActiveShipId] = useState(INITIAL_FLEET[0].id);

  const activeShip = fleet.find(s => s.id === activeShipId) || fleet[0];

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
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-amber-500/30">
      {/* Top Header - Sized for your 30px preference */}
      <header className="bg-slate-900/80 border-b border-amber-900/30 p-4 sticky top-0 z-50 backdrop-blur-md h-[80px] flex items-center">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Anchor className="text-amber-500 h-8 w-8" />
            <h1 className="text-[30px] font-black tracking-tighter text-amber-50 uppercase leading-none">
              Werewolf Fleet Manager
            </h1>
          </div>
          <div className="flex gap-4 items-center">
             <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Active Station</span>
                <span className="text-amber-500 font-mono text-sm">Gainesville_Main_Hub</span>
             </div>
             <button className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-amber-900/20">
              <Plus size={18} /> New Ship
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
        
        {/* Sidebar - Fleet List */}
        <aside className="lg:col-span-3 space-y-4">
          <h2 className="text-[12px] font-bold text-slate-500 uppercase tracking-[0.2em] px-2">Ship Registry</h2>
          <div className="space-y-2">
            {fleet.map(ship => (
              <button
                key={ship.id}
                onClick={() => setActiveShipId(ship.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${
                  activeShipId === ship.id 
                  ? 'bg-amber-900/20 border-amber-500/50 text-amber-50 shadow-inner' 
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${activeShipId === ship.id ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-500'}`}>
                    <Ship size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">{ship.name}</div>
                    <div className="text-[11px] opacity-60">Rank {ship.level} {ship.type}</div>
                  </div>
                </div>
                <div className={`h-2 w-2 rounded-full ${ship.status === 'At Sea' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-600'}`}></div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Dashboard Area */}
        <section className="lg:col-span-9 space-y-6">
          
          {/* Active Ship Header */}
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Ship size={220} />
            </div>
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <div className="flex items-center gap-2 text-amber-500 mb-1">
                    <Activity size={14} className="animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{activeShip.rank} Class Vessel</span>
                  </div>
                  <h2 className="text-[42px] font-black text-white uppercase tracking-tighter leading-none">{activeShip.name}</h2>
                  <p className="text-slate-400 max-w-md mt-3 text-[14px] leading-relaxed italic border-l-2 border-amber-600/30 pl-4">
                    "{activeShip.passive}"
                  </p>
                </div>
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 grid grid-cols-2 gap-8 min-w-[240px] backdrop-blur-sm">
                  <div className="text-center">
                    <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Repair Mod</div>
                    <div className="text-green-400 text-3xl font-black">+{healBonus}%</div>
                  </div>
                  <div className="text-center border-l border-slate-800 pl-8">
                    <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Ship Rank</div>
                    <div className="text-amber-500 text-3xl font-black">{activeShip.level}</div>
                  </div>
                </div>
              </div>

              {/* Weapons Grid */}
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Swords size={14} /> Weapon Systems
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(activeShip.weapons).map(([slot, item]) => (
                  <div key={slot} className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl group hover:border-amber-500/50 transition-all hover:scale-[1.02]">
                    <div className="text-[9px] uppercase font-bold text-slate-500 mb-3 flex justify-between items-center opacity-70">
                      <span>{slot}</span>
                      <div className="h-1 w-4 bg-amber-500/20 rounded-full group-hover:bg-amber-500 transition-colors"></div>
                    </div>
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="font-bold text-white text-[13px] line-clamp-1">{item.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1 uppercase">{item.type} • {item.power}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Furniture & Armor Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Furniture Grid */}
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl">
              <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Settings size={16} /> Loadout Furniture
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeShip.furniture.map((f) => (
                  <div 
                    key={f.slot} 
                    className={`p-3 rounded-xl border ${f.name === 'Locked' ? 'bg-slate-950/40 border-slate-800 opacity-40 grayscale' : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'} transition-all`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl p-2 bg-slate-900 rounded-lg">{f.icon}</span>
                      <div className="overflow-hidden">
                        <div className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter">Slot {f.slot}</div>
                        <div className="text-[13px] font-bold text-white truncate">{f.name}</div>
                        <div className="text-[10px] text-slate-400 truncate leading-tight mt-1">{f.bonus}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Armor & Inventory Overview */}
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl">
                <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Shield size={16} /> Hull Defense
                </h3>
                <div className="flex items-center gap-4 bg-slate-950 p-5 rounded-2xl border border-amber-900/10">
                  <div className="text-5xl drop-shadow-[0_0_15px_rgba(245,158,11,0.2)]">{activeShip.armor.icon}</div>
                  <div>
                    <div className="text-white font-black uppercase text-xl tracking-tight">{activeShip.armor.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-amber-500 font-mono text-sm font-bold">RATING: {activeShip.armor.power}</div>
                      <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500" style={{width: '85%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Area */}
              <div className="bg-gradient-to-br from-amber-600/20 via-slate-900 to-slate-900 rounded-3xl p-6 border border-amber-900/20 relative group cursor-pointer overflow-hidden shadow-xl">
                <div className="relative z-10">
                  <h3 className="text-[12px] font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Zap size={16} className="fill-amber-500" /> System Update
                  </h3>
                  <p className="text-[14px] text-slate-300 leading-relaxed">
                    Ready to sync new gear? Upload your latest PS5/PC screenshots to automatically update the Werewolf manifest.
                  </p>
                </div>
                <div className="absolute bottom-[-15px] right-[-15px] opacity-10 transform rotate-12 group-hover:scale-125 transition-transform duration-500">
                  <Anchor size={100} className="text-amber-500" />
                </div>
              </div>
            </div>

          </div>
        </section>
      </main>

      <footer className="mt-12 p-12 border-t border-slate-900 bg-slate-950/80 text-center">
        <p className="text-slate-500 text-[10px] tracking-[0.4em] uppercase font-black">
          Werewolf Projects • Gainesville • 2026
        </p>
      </footer>
    </div>
  );
}
