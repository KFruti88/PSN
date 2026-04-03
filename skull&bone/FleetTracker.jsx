import React, { useState, useEffect, useMemo } from 'react';
import { 
  Anchor, Shield, Crosshair, Zap, Settings, Plus, Ship, Swords, 
  Activity, Coins, TrendingUp, Clock, Database, ChevronRight, 
  RefreshCw, AlertCircle, Search, ExternalLink
} from 'lucide-react';

// Community Data Endpoints
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

export default function FleetTracker() {
  const [activeTab, setActiveTab] = useState('fleet');
  const [activeShipId, setActiveShipId] = useState(INITIAL_FLEET[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Master Sync State
  const [masterData, setMasterData] = useState({ 
    weapons: [], furniture: [], ships: [], loading: true, error: null 
  });

  // Sync Engine: Pulls live data from GitHub
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
        setMasterData(prev => ({ ...prev, loading: false, error: 'Connection to Master Database failed.' }));
      }
    };
    fetchMasterData();
  }, []);

  // Logic to find a weapon in the synced data
  const getWeaponStats = (name) => {
    return masterData.weapons.find(w => w.name === name) || { name, power: 0, icon: '❓' };
  };

  const activeShip = INITIAL_FLEET.find(s => s.id === activeShipId);
  const syncedWeapons = useMemo(() => {
    return Object.entries(activeShip.weapons).reduce((acc, [slot, name]) => {
      acc[slot] = getWeaponStats(name);
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
            {/* Live Sync Status */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
              {masterData.loading ? (
                <RefreshCw size={12} className="text-amber-500 animate-spin" />
              ) : masterData.error ? (
                <AlertCircle size={12} className="text-red-500" />
              ) : (
                <div className="h-2 w-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {masterData.loading ? 'Syncing...' : masterData.error ? 'Offline' : 'Data Synced'}
              </span>
            </div>

            <nav className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              {['fleet', 'armory', 'vault'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-[12px] font-bold uppercase transition-all ${
                    activeTab === tab ? 'bg-amber-600 text-white' : 'text-slate-500'
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
        
        {/* FLEET TAB: Uses Synced Data to populate build */}
        {activeTab === 'fleet' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <aside className="lg:col-span-3 space-y-4">
              <h2 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest px-2">Ship Registry</h2>
              <button className="w-full text-left p-4 rounded-xl border bg-amber-900/20 border-amber-500/50 text-amber-50 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500 text-slate-900"><Ship size={20} /></div>
                  <div>
                    <div className="font-bold text-[14px]">{activeShip.name}</div>
                    <div className="text-[11px] opacity-60">Rank {activeShip.level} {activeShip.type}</div>
                  </div>
                </div>
              </button>
            </aside>

            <section className="lg:col-span-9 space-y-6">
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl">
                <div className="mb-8">
                  <div className="flex items-center gap-2 text-amber-500 mb-1">
                    <Activity size={14} className="animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Build Manifest</span>
                  </div>
                  <h2 className="text-[42px] font-black text-white uppercase tracking-tighter leading-none">{activeShip.name}</h2>
                </div>

                {/* Live Data Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Object.entries(syncedWeapons).map(([slot, item]) => (
                    <div key={slot} className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl group hover:border-amber-500/50 transition-all">
                      <div className="text-[9px] uppercase font-bold text-slate-500 mb-3 flex justify-between items-center opacity-70">
                        <span>{slot}</span>
                        <Crosshair size={12} className="text-amber-500/40" />
                      </div>
                      <div className="text-2xl mb-2">⚔️</div>
                      <div className="font-bold text-white text-[13px] truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1 uppercase">
                        PWR {item.power || '???'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ARMORY TAB: This is the "Live" Sync Library */}
        {activeTab === 'armory' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                <div>
                  <h2 className="text-[30px] font-black text-white uppercase tracking-tighter leading-none mb-2">Synced Armory</h2>
                  <p className="text-[14px] text-slate-500 italic">Browsing {masterData.weapons.length} items from the Master Database.</p>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search master data..." 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-amber-500 outline-none transition-all"
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {masterData.weapons
                  .filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .slice(0, 50)
                  .map((weapon, idx) => (
                    <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-slate-600 transition-all flex items-center justify-between">
                       <div>
                         <div className="text-[14px] font-black text-white">{weapon.name}</div>
                         <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Power {weapon.power}</div>
                       </div>
                       <button className="p-2 bg-slate-900 rounded-lg text-amber-500 hover:bg-amber-500 hover:text-white transition-all">
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
        <p className="text-slate-600 text-[10px] tracking-[0.4em] uppercase font-black">
          Powered by Werewolf Projects • Synced with Skull & Bones Tools
        </p>
      </footer>
    </div>
  );
}
