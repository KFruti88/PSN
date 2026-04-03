import React, { useState, useEffect, useMemo } from 'react';
import { 
  Anchor, Shield, Crosshair, Zap, Settings, Plus, Ship, Swords, 
  Activity, Coins, TrendingUp, Clock, Database, ChevronRight, 
  RefreshCw, AlertCircle, Search, Trophy, Users, Map, Target,
  Gauge, BarChart4, LayoutDashboard
} from 'lucide-react';

// Community Data Master Sync Points
const DATA_URLS = {
  weapons: 'https://raw.githubusercontent.com/SkullAndBonesTools/SkullAndBonesData/main/data/weapons.json',
  furniture: 'https://raw.githubusercontent.com/SkullAndBonesTools/SkullAndBonesData/main/data/furniture.json',
  ships: 'https://raw.githubusercontent.com/SkullAndBonesTools/SkullAndBonesData/main/data/ships.json'
};

const INITIAL_FLEET = [
  {
    id: 'guardian-barque',
    name: 'Guardian',
    type: 'Barque',
    level: 11,
    weapons: {
      bow: "Naga's Call",
      port: "Endless Requiem",
      starboard: "The Rotmouth",
      stern: "Naga's Call",
      aux: "Eye of Heaven"
    },
    furniture: ["Scrapper Station", "Compagnie Screens", "Bombard Menuiserie I", "Hubac Tuning Rack", "Float Collars"],
    armor: "Black Prince"
  }
];

// Extracted from your provided stats log
const LIFETIME_STATS = {
  rank: "KINGPIN - 21",
  totalTime: "46h",
  soloTime: "17h",
  groupTime: "29h",
  shipsSunk: 802,
  silver: "6M",
  topSpeed: "24.78 kts",
  maxDamage: "5M",
  discovered: 206,
  referralProgress: 1, 
};

const SHIP_MASTERY = [
  { name: 'Hulk', damageDone: '20M', usage: '6h 50m', icon: '🏗️' },
  { name: 'Padewakang', damageDone: '10M', usage: '8h 40m', icon: '💣' },
  { name: 'Barque', damageDone: '10M', usage: '4h 57m', icon: '🛡️' },
  { name: 'Brigantine', damageDone: '219k', usage: '6m', icon: '⚡' },
];

const WAREHOUSE_ITEMS = [
  { name: 'Gold Skull Rum', qty: 450, icon: '🥃' },
  { name: 'Black Lotus Opium', qty: 220, icon: '🌸' },
  { name: 'Torsion Springs', qty: 12, icon: '⚙️' },
  { name: 'Plate Glass', qty: 35, icon: '💎' },
];

const App = () => {
  const [activeTab, setActiveTab] = useState('fleet');
  const [activeShipId, setActiveShipId] = useState(INITIAL_FLEET[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Master Sync State
  const [masterData, setMasterData] = useState({ 
    weapons: [], furniture: [], ships: [], loading: true, error: null 
  });

  // Sync Engine: Pulls live data from the community repo
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [wRes, fRes, sRes] = await Promise.all([
          fetch(DATA_URLS.weapons),
          fetch(DATA_URLS.furniture),
          fetch(DATA_URLS.ships)
        ]);
        const weapons = await wRes.json();
        const furniture = await fRes.json();
        const ships = await sRes.json();
        setMasterData({ weapons, furniture, ships, loading: false, error: null });
      } catch (err) {
        setMasterData(prev => ({ ...prev, loading: false, error: 'Master Data Sync Failed' }));
      }
    };
    fetchMasterData();
  }, []);

  const activeShip = INITIAL_FLEET.find(s => s.id === activeShipId);

  // Helper to map local build names to master data stats
  const syncedWeapons = useMemo(() => {
    return Object.entries(activeShip.weapons).reduce((acc, [slot, name]) => {
      const match = masterData.weapons.find(w => w.name === name);
      acc[slot] = match || { name, power: '91+', icon: '⚔️' };
      return acc;
    }, {});
  }, [activeShip, masterData.weapons]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-amber-500/30">
      
      {/* 30px Header */}
      <header className="bg-slate-900/80 border-b border-amber-900/30 p-4 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-2">
          <div className="flex items-center gap-3">
            <Anchor className="text-amber-500 h-8 w-8" />
            <h1 className="text-[30px] font-black tracking-tighter text-amber-50 uppercase leading-none">
              Werewolf Command
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Sync Status Badge */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
              {masterData.loading ? (
                <RefreshCw size={12} className="text-amber-500 animate-spin" />
              ) : masterData.error ? (
                <AlertCircle size={12} className="text-red-500" />
              ) : (
                <div className="h-2 w-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {masterData.loading ? 'Syncing Library' : masterData.error ? 'Offline' : 'Database Live'}
              </span>
            </div>

            <nav className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              {['fleet', 'logbook', 'armory', 'vault'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-[12px] font-bold uppercase transition-all ${
                    activeTab === tab ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 mt-4">
        
        {/* FLEET TAB */}
        {activeTab === 'fleet' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <aside className="lg:col-span-3 space-y-4">
              <h2 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest px-2 leading-none">Active Fleet</h2>
              <button className="w-full text-left p-4 rounded-xl border bg-amber-900/20 border-amber-500/50 text-amber-50 shadow-inner group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500 text-slate-900"><Ship size={20} /></div>
                  <div>
                    <div className="font-bold text-[14px] leading-tight">{activeShip.name}</div>
                    <div className="text-[11px] opacity-60">Rank {activeShip.level} {activeShip.type}</div>
                  </div>
                </div>
              </button>
              <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Build Focus</div>
                <div className="flex items-center gap-2 text-green-400">
                   <Activity size={14} />
                   <span className="text-[12px] font-bold">Group Healing / Buffs</span>
                </div>
              </div>
            </aside>

            <section className="lg:col-span-9 space-y-6">
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="mb-8 relative z-10">
                  <div className="flex items-center gap-2 text-amber-500 mb-1">
                    <Zap size={14} className="fill-amber-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Equipped Weaponry</span>
                  </div>
                  <h2 className="text-[42px] font-black text-white uppercase tracking-tighter leading-none">{activeShip.name}</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 relative z-10">
                  {Object.entries(syncedWeapons).map(([slot, item]) => (
                    <div key={slot} className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl group hover:border-amber-500/50 transition-all">
                      <div className="text-[9px] uppercase font-bold text-slate-500 mb-3 flex justify-between items-center opacity-70">
                        <span>{slot}</span>
                        <Crosshair size={12} className="text-amber-500/20 group-hover:text-amber-500" />
                      </div>
                      <div className="text-2xl mb-2">{item.name.includes('Eye') ? '⚡' : item.name.includes('Endless') ? '🚀' : '⚔️'}</div>
                      <div className="font-bold text-white text-[13px] truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1 uppercase">PWR {item.power}</div>
                    </div>
                  ))}
                </div>
                <Ship size={280} className="absolute bottom-[-60px] right-[-40px] text-white/[0.03] -rotate-12" />
              </div>
            </section>
          </div>
        )}

        {/* LOGBOOK TAB: Progression Tracking */}
        {activeTab === 'logbook' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 bg-gradient-to-br from-amber-600 to-amber-900 p-8 rounded-3xl shadow-xl">
                 <div className="flex items-center gap-6">
                    <div className="h-20 w-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30">
                       <Trophy size={40} className="text-white drop-shadow-lg" />
                    </div>
                    <div>
                       <div className="text-white/60 text-[11px] font-black uppercase tracking-widest leading-none mb-2">Account Rank</div>
                       <h2 className="text-[34px] font-black text-white uppercase tracking-tighter leading-none">{LIFETIME_STATS.rank}</h2>
                       <div className="h-1.5 w-full bg-black/20 rounded-full mt-4 overflow-hidden">
                          <div className="h-full bg-white animate-pulse" style={{width: '78%'}}></div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col justify-center">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                       <Users size={16} className="text-amber-500" /> Referral Progress
                    </h3>
                    <span className="text-amber-500 text-[12px] font-bold">{LIFETIME_STATS.referralProgress} / 4</span>
                 </div>
                 <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(step => (
                       <div key={step} className={`h-2 rounded-full ${step <= LIFETIME_STATS.referralProgress ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-slate-800'}`}></div>
                    ))}
                 </div>
                 <p className="text-[14px] text-slate-400 mt-4 italic leading-relaxed">"Fishers of Men Set active. Next reward at 2 referrals."</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Time Played', val: LIFETIME_STATS.totalTime, icon: Clock, color: 'text-blue-400' },
                { label: 'Ships Sunk', val: LIFETIME_STATS.shipsSunk, icon: Target, color: 'text-red-400' },
                { label: 'Silver', val: LIFETIME_STATS.silver, icon: Coins, color: 'text-yellow-500' },
                { label: 'Settlements', val: LIFETIME_STATS.discovered, icon: Map, color: 'text-green-400' },
                { label: 'Top Speed', val: LIFETIME_STATS.topSpeed, icon: Gauge, color: 'text-amber-400' }
              ].map((stat, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col items-center text-center hover:bg-slate-900 transition-colors">
                  <stat.icon size={20} className={`${stat.color} mb-3`} />
                  <div className="text-white text-[18px] font-black tracking-tight leading-none">{stat.val}</div>
                  <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-2">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800">
               <h3 className="text-[14px] font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                  <BarChart4 size={18} className="text-amber-500" /> Lifetime Ship Mastery
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SHIP_MASTERY.map((ship, idx) => (
                    <div key={idx} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <span className="text-3xl">{ship.icon}</span>
                          <div>
                            <div className="text-[14px] font-black text-white uppercase">{ship.name}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Class Mastery Level Max</div>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="text-amber-500 font-mono text-[16px] font-black leading-none mb-1">{ship.damageDone} DMG</div>
                          <div className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">{ship.usage} played</div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* VAULT TAB */}
        {activeTab === 'vault' && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-6">
             <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800">
                <div className="flex justify-between items-center mb-8">
                   <div>
                      <h2 className="text-[30px] font-black text-white uppercase tracking-tighter leading-none mb-2">Warehouse Manifest</h2>
                      <p className="text-[14px] text-slate-500 italic">Tracking {LIFETIME_STATS.silver} Silver and inventory assets.</p>
                   </div>
                   <div className="bg-slate-950 px-6 py-4 rounded-2xl border border-amber-500/20 text-center">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 leading-none">Net Worth</div>
                      <div className="text-[28px] font-black text-amber-500 leading-none">{LIFETIME_STATS.silver}</div>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   {WAREHOUSE_ITEMS.map((item, idx) => (
                     <div key={idx} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex items-center justify-between group hover:border-slate-600 transition-all">
                        <div className="flex items-center gap-3">
                           <span className="text-2xl">{item.icon}</span>
                           <div className="text-[13px] font-bold text-white leading-tight">{item.name}</div>
                        </div>
                        <div className="text-amber-500 font-black text-[18px] leading-none">{item.qty}</div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {/* ARMORY TAB: Live Master Data Browser */}
        {activeTab === 'armory' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                <div>
                  <h2 className="text-[30px] font-black text-white uppercase tracking-tighter leading-none mb-2 text-[30px]">Synced Armory</h2>
                  <p className="text-[14px] text-slate-500 italic">Browsing {masterData.weapons.length} blueprints from the community master library.</p>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search master data..." 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-[14px] focus:border-amber-500 outline-none transition-all placeholder:text-slate-700"
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {masterData.weapons
                  .filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .slice(0, 50)
                  .map((weapon, idx) => (
                    <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-slate-600 transition-all flex items-center justify-between group">
                       <div>
                         <div className="text-[14px] font-black text-white group-hover:text-amber-500 transition-colors leading-tight mb-1">{weapon.name}</div>
                         <div className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Power Rating: {weapon.power}</div>
                       </div>
                       <button className="p-2 bg-slate-900 rounded-lg text-amber-500 hover:bg-amber-500 hover:text-white transition-all shadow-inner">
                         <Plus size={16} />
                       </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 p-8 border-t border-slate-900 bg-slate-950 text-center">
        <p className="text-slate-600 text-[10px] tracking-[0.4em] uppercase font-black leading-none mb-2">
          Gainesville Station • Werewolf Command • Synced 2026
        </p>
        <p className="text-slate-800 text-[9px] uppercase tracking-widest">
          Data provided by Skull & Bones Tools Community Repository
        </p>
      </footer>

      {/* Internal Custom Styles for Scrollbar */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />
    </div>
  );
};

export default App;
