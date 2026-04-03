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
  Activity,
  Coins,
  TrendingUp,
  Clock,
  Database,
  ChevronRight,
  Package,
  ArrowUpRight
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

const INITIAL_WAREHOUSE = [
  { id: 1, name: 'Gold Skull Rum', category: 'Smuggler', qty: 450, icon: '🥃' },
  { id: 2, name: 'Black Lotus Opium', category: 'Smuggler', qty: 220, icon: '🌸' },
  { id: 3, name: 'Torsion Springs', category: 'Material', qty: 12, icon: '⚙️' },
  { id: 4, name: 'Plate Glass', category: 'Material', qty: 35, icon: '💎' },
  { id: 5, name: 'Poppy', category: 'Raw', qty: 1200, icon: '🌿' },
];

const FleetTracker = () => {
  const [activeTab, setActiveTab] = useState('fleet');
  const [fleet, setFleet] = useState(INITIAL_FLEET);
  const [activeShipId, setActiveShipId] = useState(INITIAL_FLEET[0].id);
  const [warehouse, setWarehouse] = useState(INITIAL_WAREHOUSE);
  
  // Empire Metrics
  const [po8Total, setPo8Total] = useState(15400);
  const [po8Hourly, setPo8Hourly] = useState(850);

  const activeShip = fleet.find(s => s.id === activeShipId) || fleet[0];

  const updateQty = (id, delta) => {
    setWarehouse(prev => prev.map(item => 
      item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item
    ));
  };

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

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-amber-500/30">
      
      {/* 30px Header */}
      <header className="bg-slate-900/80 border-b border-amber-900/30 p-4 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Anchor className="text-amber-500 h-8 w-8" />
            <h1 className="text-[30px] font-black tracking-tighter text-amber-50 uppercase leading-none">
              Werewolf Command
            </h1>
          </div>

          <nav className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'fleet', icon: Ship, label: 'Fleet' },
              { id: 'empire', icon: TrendingUp, label: 'Empire' },
              { id: 'warehouse', icon: Database, label: 'Vault' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold transition-all ${
                  activeTab === tab.id ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <tab.icon size={14} />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 mt-4">
        
        {/* FLEET TAB */}
        {activeTab === 'fleet' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <aside className="lg:col-span-3 space-y-4">
              <h2 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest px-2">Ship Registry</h2>
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
                        <div className="font-bold text-[14px]">{ship.name}</div>
                        <div className="text-[11px] opacity-60">Rank {ship.level} {ship.type}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <section className="lg:col-span-9 space-y-6">
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 relative overflow-hidden shadow-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <div>
                    <div className="flex items-center gap-2 text-amber-500 mb-1">
                      <Activity size={14} className="animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Guardian Build</span>
                    </div>
                    <h2 className="text-[42px] font-black text-white uppercase tracking-tighter leading-none">{activeShip.name}</h2>
                    <p className="text-slate-400 max-w-md mt-3 text-[14px] italic border-l-2 border-amber-600/30 pl-4">{activeShip.passive}</p>
                  </div>
                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 grid grid-cols-2 gap-8 min-w-[240px]">
                    <div className="text-center">
                      <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Repair Mod</div>
                      <div className="text-green-400 text-3xl font-black">+{calculateHealBonus(activeShip)}%</div>
                    </div>
                    <div className="text-center border-l border-slate-800 pl-8">
                      <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Ship Rank</div>
                      <div className="text-amber-500 text-3xl font-black">{activeShip.level}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Object.entries(activeShip.weapons).map(([slot, item]) => (
                    <div key={slot} className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl group hover:border-amber-500/50 transition-all">
                      <div className="text-[9px] uppercase font-bold text-slate-500 mb-3 flex justify-between items-center opacity-70">
                        <span>{slot}</span>
                        <Crosshair size={12} className="text-amber-500/40 group-hover:text-amber-500 transition-colors" />
                      </div>
                      <div className="text-2xl mb-2">{item.icon}</div>
                      <div className="font-bold text-white text-[13px] truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1 uppercase">{item.type} • {item.power}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800">
                  <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Settings size={16} /> Loadout Furniture
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeShip.furniture.map((f) => (
                      <div key={f.slot} className={`p-3 rounded-xl border ${f.name === 'Locked' ? 'bg-slate-950/40 border-slate-800 opacity-40' : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'} transition-all`}>
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
                <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 flex flex-col justify-center items-center text-center space-y-4">
                  <div className="text-5xl">{activeShip.armor.icon}</div>
                  <div>
                    <h3 className="text-white font-black uppercase text-xl">{activeShip.armor.name}</h3>
                    <div className="text-amber-500 font-mono text-sm font-bold">RATING: {activeShip.armor.power}</div>
                  </div>
                  <div className="h-1.5 w-full max-w-[200px] bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{width: '90%'}}></div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* EMPIRE TAB */}
        {activeTab === 'empire' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 rounded-3xl p-6 border border-amber-900/20 flex items-center gap-6">
                <div className="h-14 w-14 bg-amber-600/20 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner">
                  <Coins size={28} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Stash</h3>
                  <div className="text-[30px] font-black text-amber-50 leading-none">{po8Total.toLocaleString()}</div>
                </div>
              </div>
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 flex items-center gap-6">
                <div className="h-14 w-14 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                  <TrendingUp size={28} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Hourly Yield</h3>
                  <div className="text-[30px] font-black text-blue-50 leading-none">+{po8Hourly} /hr</div>
                </div>
              </div>
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 flex items-center gap-6">
                <div className="h-14 w-14 bg-green-600/20 rounded-2xl flex items-center justify-center text-green-400 border border-green-500/20">
                  <Clock size={28} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Full In</h3>
                  <div className="text-[30px] font-black text-green-50 leading-none text-[30px]">03:15:20</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-xl">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-[30px] font-black text-white uppercase tracking-tighter leading-none mb-2">Manufactory Progress</h2>
                  <p className="text-[14px] text-slate-500">Track production across your captured locations.</p>
                </div>
                <button className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-900/30">
                  Fund All
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { name: 'Harufu', region: 'Africa', rate: 145, progress: '95%', color: 'bg-green-500' },
                  { name: 'Sainte-Anne', region: 'Red Isle', rate: 80, progress: '40%', color: 'bg-amber-500' },
                  { name: 'Fort Louis', region: 'Red Isle', rate: 55, progress: '100%', color: 'bg-green-500 animate-pulse' },
                  { name: 'Suny', region: 'East Indies', rate: 110, progress: '15%', color: 'bg-blue-500' }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between group hover:border-amber-500/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center font-black text-[11px] text-amber-500">LVL 7</div>
                      <div>
                        <div className="text-[14px] font-black text-white uppercase tracking-tight">{item.name}</div>
                        <div className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">{item.region}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-10">
                      <div className="hidden md:block text-right">
                        <div className="text-[10px] text-slate-600 uppercase font-bold tracking-widest mb-1">Production</div>
                        <div className="text-[14px] font-mono text-slate-300">+{item.rate}/hr</div>
                      </div>
                      <div className="w-40">
                        <div className="flex justify-between mb-1">
                          <span className="text-[10px] text-slate-600 uppercase font-bold">Capacity</span>
                          <span className="text-[10px] font-bold text-slate-300">{item.progress}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${item.color}`} style={{width: item.progress}}></div>
                        </div>
                      </div>
                      <button className="p-2 text-slate-600 hover:text-amber-500 transition-colors">
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* WAREHOUSE TAB */}
        {activeTab === 'warehouse' && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                <div>
                  <h2 className="text-[30px] font-black text-white uppercase tracking-tighter leading-none mb-2">Warehouse Manifest</h2>
                  <p className="text-[14px] text-slate-500 italic">Inventory logs for Smuggler goods and Upgrade materials.</p>
                </div>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {['All', 'Smuggler', 'Material'].map(f => (
                    <button key={f} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-amber-500 transition-colors">{f}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warehouse.map((item) => (
                  <div key={item.id} className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 flex items-center justify-between group hover:border-slate-600 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl p-2 bg-slate-900 rounded-xl group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                      <div>
                        <div className="text-[14px] font-black text-white leading-tight">{item.name}</div>
                        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">{item.category}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[20px] font-black text-amber-500 leading-none">{item.qty.toLocaleString()}</div>
                      <div className="flex gap-1 mt-2 justify-end">
                         <button onClick={() => updateQty(item.id, -1)} className="h-6 w-6 rounded bg-slate-900 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">-</button>
                         <button onClick={() => updateQty(item.id, 1)} className="h-6 w-6 rounded bg-slate-900 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">+</button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-700 hover:text-amber-500 hover:border-amber-500/50 transition-all cursor-pointer group">
                  <Plus size={32} className="mb-2 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Register Item</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      <footer className="mt-12 p-12 border-t border-slate-900 bg-slate-950 text-center">
        <p className="text-slate-600 text-[10px] tracking-[0.4em] uppercase font-black">
          Werewolf Projects • Gainesville • 2026
        </p>
      </footer>
    </div>
  );
};

export default FleetTracker;
