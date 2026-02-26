import React, { useState, useEffect } from 'react';
import { Trophy, Shield, Star, Crown, Plus, Minus, Users, Target } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'cotw-trophy-display';

const TROPHY_TYPES = [
  { id: 'bronze', label: 'Bronze', color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-700/50' },
  { id: 'silver', label: 'Silver', color: 'text-slate-300', bg: 'bg-slate-700/20', border: 'border-slate-500/50' },
  { id: 'gold', label: 'Gold', color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-600/50' },
  { id: 'diamond', label: 'Diamond', color: 'text-cyan-300', bg: 'bg-cyan-900/20', border: 'border-cyan-500/50' },
  { id: 'mythical', label: 'Mythical', color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-600/50' },
  { id: 'greatone', label: 'Great One', color: 'text-red-500', bg: 'bg-red-900/30', border: 'border-red-600', special: true },
];

const PLAYERS = [
  { id: 'Werewolf3788', name: 'Werewolf3788', role: 'Lead Developer', theme: 'orange' },
  { id: 'Raymystyro', name: 'Raymystyro', role: 'Speedray', theme: 'red' },
  { id: 'terrdog420', name: 'terrdog420', role: 'DarkWing Dog', theme: 'purple' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [trophyData, setTrophyData] = useState({});
  const [loading, setLoading] = useState(true);

  // Auth Initialization
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Firestore Sync
  useEffect(() => {
    if (!user) return;

    const trophiesRef = collection(db, 'artifacts', appId, 'public', 'data', 'userTrophies');
    const unsubscribe = onSnapshot(trophiesRef, (snapshot) => {
      const data = {};
      snapshot.forEach((doc) => {
        data[doc.id] = doc.data();
      });
      setTrophyData(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const updateTrophy = async (playerId, trophyId, delta) => {
    if (!user) return;
    
    const currentCount = trophyData[playerId]?.[trophyId] || 0;
    const newCount = Math.max(0, currentCount + delta);
    
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'userTrophies', playerId);
      await setDoc(docRef, {
        ...trophyData[playerId],
        [trophyId]: newCount,
        lastUpdated: Date.now()
      }, { merge: true });
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center text-emerald-500 font-mono">
        <div className="animate-pulse flex flex-col items-center">
          <Target className="w-12 h-12 mb-4 animate-spin-slow" />
          <p>LOADING TROPHY ROOM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] text-stone-200 p-4 md:p-8 font-sans">
      <style>{`
        #wp-custom-wrapper {
          background: transparent !important;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .great-one-glow {
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
          animation: pulse-red 2s infinite ease-in-out;
        }
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }
          50% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.6); }
        }
      `}</style>

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-12 text-center">
        <h1 className="text-4xl md:text-6xl font-black text-emerald-500 tracking-tighter mb-2 flex items-center justify-center gap-4">
          <Target className="w-10 h-10 md:w-14 md:h-14" />
          theHunter: COTW
        </h1>
        <p className="text-emerald-800 font-mono uppercase tracking-[0.3em] text-sm">Official Squad Trophy Display</p>
      </div>

      {/* Player Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {PLAYERS.map((player) => (
          <div key={player.id} className={`bg-stone-900/40 border border-${player.theme}-900/30 rounded-2xl overflow-hidden backdrop-blur-sm`}>
            {/* Player Header */}
            <div className={`bg-${player.theme}-950/20 p-6 border-b border-${player.theme}-900/30 flex items-center justify-between`}>
              <div>
                <h2 className={`text-2xl font-bold text-${player.theme}-400 leading-none`}>{player.name}</h2>
                <span className={`text-xs text-${player.theme}-700 font-mono uppercase mt-1 inline-block tracking-wider`}>{player.role}</span>
              </div>
              <div className={`bg-${player.theme}-900/20 p-3 rounded-full`}>
                <Users className={`text-${player.theme}-500 w-6 h-6`} />
              </div>
            </div>

            {/* Trophy List */}
            <div className="p-4 space-y-3">
              {TROPHY_TYPES.map((type) => {
                const count = trophyData[player.id]?.[type.id] || 0;
                const isGreatOne = type.id === 'greatone';

                return (
                  <div 
                    key={type.id} 
                    className={`flex items-center justify-between p-4 rounded-xl border ${type.border} ${type.bg} transition-all duration-300 ${isGreatOne && count > 0 ? 'great-one-glow border-red-500/50' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg bg-black/40 ${type.color}`}>
                        {isGreatOne ? <Crown className="w-6 h-6" /> : <Trophy className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className={`text-xs font-mono uppercase tracking-widest opacity-60`}>{type.label}</p>
                        <p className={`text-2xl font-black ${type.color}`}>{count}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateTrophy(player.id, type.id, -1)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-black/40 hover:bg-red-900/40 text-stone-500 hover:text-red-400 transition-colors"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => updateTrophy(player.id, type.id, 1)}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg bg-black/40 hover:bg-emerald-900/40 ${type.color} transition-colors`}
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Stats Footer */}
            <div className={`bg-${player.theme}-950/10 p-4 border-t border-${player.theme}-900/20`}>
              <div className={`flex justify-between items-center text-sm font-mono text-${player.theme}-800`}>
                <span>TOTAL HARVESTS:</span>
                <span className={`text-${player.theme}-500 font-bold`}>
                  {Object.entries(trophyData[player.id] || {}).reduce((acc, [key, val]) => typeof val === 'number' ? acc + val : acc, 0)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="max-w-6xl mx-auto mt-12 p-6 border-t border-emerald-900/10 text-center">
        <p className="text-emerald-900 text-xs font-mono uppercase tracking-[0.2em]">
          Data synced via Lead Dev: Werewolf3788 • High Performance Hunting Dashboard
        </p>
      </div>
    </div>
  );
}
