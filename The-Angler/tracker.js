import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, setDoc, updateDoc, increment } from 'firebase/firestore';
import { Trophy, Fish, User, LayoutDashboard, Settings, Plus, Minus, ChevronRight, BarChart3, Medal, Star, ExternalLink, ShoppingBag, Waves, Lock, X, ShieldCheck, LogOut, UserCheck } from 'lucide-react';

// Firebase configuration using the correct environment global
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'angler-catch-tracker';

// TWITCH AUTH SETTINGS
// You need to get a Client ID from dev.twitch.tv
const TWITCH_CLIENT_ID = "ud0xyhix3nwu2lzeomn5swvlhww9j0"; 
// This should be the URL where your tracker is hosted on WordPress
const REDIRECT_URI = window.location.href.split('#')[0]; 

// Defined Users
const PLAYERS = [
  { 
    id: 'Werewolf3788', 
    name: 'Werewolf3788', 
    color: 'text-orange-500', 
    bg: 'bg-orange-50', 
    accentBg: 'bg-orange-950/50',
    border: 'border-orange-600/40',
    avatarBorder: 'border-orange-500',
    glow: 'bg-orange-600',
    avatar: 'https://static-cdn.jtvnw.net/jtv_user_pictures/1a4efdb4-023e-4802-b07c-82c09a45c4c8-profile_image-70x70.png'
  },
  { 
    id: 'Raymystyro', 
    name: 'Raymystyro', 
    color: 'text-red-600', 
    bg: 'bg-red-50', 
    accentBg: 'bg-red-950/50',
    border: 'border-red-700/40',
    avatarBorder: 'border-red-700',
    glow: 'bg-red-700',
    avatar: 'https://static-cdn.jtvnw.net/jtv_user_pictures/032a0367-589f-4763-94de-4fc679a0b2df-profile_image-70x70.png'
  },
  { 
    id: 'terrdog420', 
    name: 'terrdog420', 
    color: 'text-purple-500', 
    bg: 'bg-purple-50', 
    accentBg: 'bg-purple-950/50',
    border: 'border-purple-500/40',
    avatarBorder: 'border-purple-500',
    glow: 'bg-purple-500',
    avatar: 'https://static-cdn.jtvnw.net/jtv_user_pictures/9dad426e-04cb-4fc0-a917-25982b3800ce-profile_image-70x70.png'
  }
];

// Standard Fish Species
const STANDARD_FISH = [
  "Largemouth Bass", "Smallmouth Bass", "Rainbow Trout", "Brown Trout", "Lake Trout", 
  "Brook Trout", "Northern Pike", "Tiger Muskie", "Yellow Perch", "Bluegill", 
  "Pumpkinseed", "Black Crappie", "Channel Catfish", "Burbot", "Atlantic Salmon",
  "African Tigerfish", "Rednose Labeo", "Japanese Eel", "Cherry Salmon", "European Eel",
  "Shovelnose Sturgeon", "Mirror Carp", "Dolly Varden Trout", "Crucian Carp", "Redbreast Kurper",
  "Ohrid Trout", "Zander", "European Perch", "Asp", "Ide", "Arctic Char", "Grayling"
].sort();

const LEGENDARY_FISH = [
  "Sidewinder", "Goldstein", "The Warden", "Big Larry", "Kuroyama", "Speira", 
  "Dominator", "General", "Matriarch", "The Prodigy", "Siren", "Hannibal"
].sort();

const STANDARD_RANKS = [
  { id: 'bronze', label: 'Bronze', color: 'text-orange-400', weight: 1 },
  { id: 'silver', label: 'Silver', color: 'text-slate-400', weight: 2 },
  { id: 'gold', label: 'Gold', color: 'text-yellow-500', weight: 3 },
  { id: 'diamond', label: 'Diamond', color: 'text-cyan-400', weight: 5 }
];

const PlayerAvatar = ({ player, size = "w-14 h-14" }) => {
  const [error, setError] = useState(false);
  const isImageUrl = (url) => url && (url.includes('static-cdn') || url.match(/\.(jpeg|jpg|gif|png)$/) != null);
  if (!player.avatar || error || !isImageUrl(player.avatar)) {
    return (
      <div className={`${size} rounded-2xl flex items-center justify-center border-2 shadow-2xl ${player.accentBg} ${player.avatarBorder}`}>
        <User className="w-1/2 h-1/2 text-white" />
      </div>
    );
  }
  return (
    <div className={`${size} rounded-2xl overflow-hidden border-2 shadow-2xl ${player.avatarBorder}`}>
      <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" onError={() => setError(true)} />
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activePlayer, setActivePlayer] = useState(null);
  const [loggedInAs, setLoggedInAs] = useState(null); 
  const [view, setView] = useState('display'); 
  const [catches, setCatches] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('standard');
  const [authError, setAuthError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // 1. Initialize Firebase Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth error:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Handle Twitch OAuth Return
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const token = new URLSearchParams(hash.substring(1)).get('access_token');
      if (token) {
        verifyTwitchUser(token);
        // Clean the URL hash
        window.history.replaceState(null, null, window.location.pathname);
      }
    }
  }, []);

  const verifyTwitchUser = async (token) => {
    setIsVerifying(true);
    try {
      const response = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Client-Id': TWITCH_CLIENT_ID
        }
      });
      const data = await response.json();
      const twitchName = data.data?.[0]?.display_name;
      
      if (twitchName) {
        const matchingPlayer = PLAYERS.find(p => p.id.toLowerCase() === twitchName.toLowerCase());
        if (matchingPlayer) {
          setLoggedInAs(matchingPlayer.id);
          if (matchingPlayer.id === 'Werewolf3788') {
            setView('landing');
          } else {
            setActivePlayer(matchingPlayer);
            setView('tracker');
          }
        } else {
          setAuthError(`Access Denied: Twitch account "${twitchName}" is not authorized.`);
        }
      }
    } catch (err) {
      setAuthError("Twitch verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTwitchLogin = () => {
    if (!TWITCH_CLIENT_ID) {
      setAuthError("System Error: Twitch Client ID not configured.");
      return;
    }
    const scope = "user:read:email";
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${scope}`;
    window.location.href = authUrl;
  };

  // 3. Firestore Listener
  useEffect(() => {
    if (!user) return;
    const catchesRef = collection(db, 'artifacts', appId, 'public', 'data', 'catches');
    const unsubscribe = onSnapshot(catchesRef, (snapshot) => {
      const data = {};
      snapshot.forEach(doc => { data[doc.id] = doc.data(); });
      setCatches(data);
      setLoading(false);
    }, (error) => { setLoading(false); });
    return () => unsubscribe();
  }, [user]);

  const updateCatch = async (playerId, fishName, rank, change) => {
    if (!user) return;
    const docId = `${playerId}_${fishName.replace(/\s+/g, '_')}`;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'catches', docId);
    try {
      await setDoc(docRef, {
        playerId,
        fishName,
        [rank]: increment(change)
      }, { merge: true });
    } catch (err) { console.error("Update error:", err); }
  };

  const getCount = (playerId, fishName, rank) => {
    const docId = `${playerId}_${fishName.replace(/\s+/g, '_')}`;
    return catches[docId]?.[rank] || 0;
  };

  const getDynamicRank = (diamonds) => {
    if (diamonds >= 50) return "Elite Angler";
    if (diamonds >= 31) return "Pro Angler";
    if (diamonds >= 21) return "Advanced Angler";
    if (diamonds >= 11) return "Intermediate Angler";
    return "Beginner Angler";
  };

  const stats = useMemo(() => {
    const s = {};
    PLAYERS.forEach(p => {
      s[p.id] = { bronze: 0, silver: 0, gold: 0, diamond: 0, legendary: 0, total: 0, score: 0 };
    });
    Object.values(catches).forEach(entry => {
      const p = entry.playerId;
      if (s[p]) {
        STANDARD_RANKS.forEach(r => {
          const val = entry[r.id] || 0;
          s[p][r.id] += val;
          s[p].total += val;
          s[p].score += (val * r.weight);
        });
        const leg = entry.legendary || 0;
        s[p].legendary += leg;
        s[p].total += leg;
        s[p].score += (leg * 10);
      }
    });
    return s;
  }, [catches]);

  const sortedPlayers = useMemo(() => {
    return [...PLAYERS].sort((a, b) => (stats[b.id]?.total || 0) - (stats[a.id]?.total || 0));
  }, [stats]);

  const handleLogout = () => {
    setLoggedInAs(null);
    setActivePlayer(null);
    setView('display');
  };

  // Views
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-200">
          <div className="mb-6 flex justify-center">
            <div className="bg-purple-600 p-4 rounded-2xl shadow-lg relative">
              <ShieldCheck className="w-10 h-10 text-white" />
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Master Admin</h1>
          <p className="text-slate-500 mb-8 font-medium">Logged in via Twitch: <span className="text-purple-600 font-bold">{loggedInAs}</span></p>
          <div className="space-y-3 w-full">
            {PLAYERS.map(player => (
              <button key={player.id} onClick={() => { setActivePlayer(player); setView('tracker'); }} className="w-full p-4 flex items-center justify-between bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group">
                <div className="flex items-center gap-3">
                  <PlayerAvatar player={player} size="w-10 h-10" />
                  <span className="font-semibold text-slate-700">{player.name}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
              </button>
            ))}
            <div className="pt-6 flex flex-col gap-3 border-t border-slate-100 mt-6">
              <button onClick={() => setView('display')} className="w-full p-4 flex items-center justify-center gap-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-bold shadow-lg"><LayoutDashboard className="w-5 h-5" /> Live Leaderboard</button>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 mt-2 transition-colors"><LogOut className="w-3 h-3" /> Sign Out</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'tracker') {
    return (
      <div className="min-h-screen bg-white md:p-6 pb-24">
        <div className="max-w-4xl mx-auto w-[90%]">
          <div className="flex items-center justify-between mb-8 sticky top-0 bg-white/90 backdrop-blur-md py-4 z-10 border-b border-slate-100">
            <div className="flex items-center gap-4">
              {loggedInAs === 'Werewolf3788' ? (
                <button onClick={() => setView('landing')} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight className="w-6 h-6 text-slate-600 rotate-180" /></button>
              ) : (
                <button onClick={handleLogout} className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors"><LogOut className="w-6 h-6" /></button>
              )}
              <div className="flex items-center gap-3">
                <PlayerAvatar player={activePlayer} size="w-10 h-10" />
                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-tight">{activePlayer.name}</h2>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{getDynamicRank(stats[activePlayer.id]?.diamond || 0)}</p>
                </div>
              </div>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setActiveTab('standard')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'standard' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>STANDARD</button>
              <button onClick={() => setActiveTab('legendary')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'legendary' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500'}`}>LEGENDARY</button>
            </div>
          </div>
          <div className="relative mb-6">
            <input type="text" placeholder={`Search ${activeTab}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <Fish className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            {(activeTab === 'standard' ? STANDARD_FISH : LEGENDARY_FISH).filter(f => f.toLowerCase().includes(searchTerm.toLowerCase())).map(fish => (
              <div key={fish} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all hover:border-slate-300">
                <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">{activeTab === 'legendary' ? <Star className="w-4 h-4 text-purple-500 fill-purple-500" /> : <div className="w-2 h-2 rounded-full bg-blue-500" />}{fish}</h3>
                <div className={`grid gap-3 ${activeTab === 'standard' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1'}`}>
                  {(activeTab === 'standard' ? STANDARD_RANKS : [{id: 'legendary', label: 'Legendary Catch', color: 'text-purple-500'}]).map(rank => (
                    <div key={rank.id} className="flex flex-col items-center bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <span className={`text-[10px] font-black uppercase mb-2 ${rank.color}`}>{rank.label}</span>
                      <div className="flex items-center gap-4">
                        <button onClick={() => updateCatch(activePlayer.id, fish, rank.id, -1)} disabled={getCount(activePlayer.id, fish, rank.id) <= 0} className="p-1 rounded bg-white border border-slate-200 disabled:opacity-30 text-slate-500"><Minus className="w-4 h-4" /></button>
                        <span className="font-bold text-slate-800 text-lg tabular-nums">{getCount(activePlayer.id, fish, rank.id)}</span>
                        <button onClick={() => updateCatch(activePlayer.id, fish, rank.id, 1)} className="p-1 rounded bg-white border border-slate-200 text-slate-500"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'display') {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white p-4 md:p-10 font-sans selection:bg-blue-500/30">
        <div className="max-w-6xl mx-auto w-[90%]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-600 p-2 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)]"><Trophy className="text-white w-8 h-8" /></div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">The Angler <span className="text-blue-500">Live Tracker</span></h1>
              </div>
              <p className="text-slate-400 font-medium flex items-center gap-2">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
                Live competition data across reserves
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <button 
                onClick={loggedInAs ? (loggedInAs === 'Werewolf3788' ? () => setView('landing') : () => setView('tracker')) : handleTwitchLogin}
                disabled={isVerifying}
                className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 px-6 py-3 rounded-2xl text-xs font-black tracking-widest uppercase transition-all flex items-center gap-2 group disabled:opacity-50"
              >
                {isVerifying ? <Waves className="animate-spin w-4 h-4" /> : (loggedInAs ? <UserCheck className="w-4 h-4 text-green-500" /> : <ShieldCheck className="w-4 h-4 text-purple-400" />)}
                {isVerifying ? 'Verifying...' : (loggedInAs ? `Logged in as ${loggedInAs}` : 'Verify Twitch Identity')}
              </button>
              {authError && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tighter max-w-[200px] text-right">{authError}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {sortedPlayers.map((player, index) => (
              <div key={player.id} className={`bg-slate-800/40 border ${player.border} rounded-[2.5rem] p-8 relative overflow-hidden backdrop-blur-sm group hover:scale-[1.02] transition-transform duration-500`}>
                <div className="absolute -top-2 -right-2 bg-slate-900 border border-slate-700 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl italic z-10 shadow-xl">#{index + 1}</div>
                <div className={`absolute top-0 right-0 w-48 h-48 opacity-10 blur-3xl -mr-16 -mt-16 rounded-full ${player.glow}`}></div>
                <div className="flex items-center gap-5 mb-8 relative">
                  <PlayerAvatar player={player} size="w-20 h-20" />
                  <div>
                    <h2 className={`text-3xl font-black tracking-tight group-hover:${player.color} transition-colors`}>{player.name}</h2>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest opacity-60">{getDynamicRank(stats[player.id]?.diamond || 0)}</p>
                  </div>
                </div>
                <div className="space-y-4 relative">
                  <div className="flex items-center justify-between bg-purple-600/10 p-5 rounded-3xl border border-purple-500/30 group/stat">
                    <div className="flex items-center gap-4"><div className="p-2 bg-purple-500/20 rounded-xl"><Star className="w-6 h-6 text-purple-400 fill-purple-400" /></div><span className="text-purple-100 font-black text-sm uppercase tracking-wider">Legendary</span></div>
                    <span className="text-3xl font-black text-purple-400 tabular-nums">{stats[player.id]?.legendary || 0}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {STANDARD_RANKS.slice(0).reverse().map(rank => (
                      <div key={rank.id} className="flex flex-col bg-slate-900/60 p-4 rounded-3xl border border-slate-700/40 hover:border-slate-500 transition-colors">
                        <div className="flex items-center gap-2 mb-1"><Medal className={`w-4 h-4 ${rank.color}`} /><span className="text-slate-500 font-black text-[10px] uppercase tracking-tighter">{rank.label}</span></div>
                        <span className={`text-2xl font-black ${rank.color} tabular-nums`}>{stats[player.id]?.[rank.id] || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-700/50 flex justify-between items-end">
                  <div><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Species Caught</p><p className="text-2xl font-black text-white">{stats[player.id]?.total}</p></div>
                  <div className="text-right"><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Pro Score</p><p className={`text-2xl font-black ${player.color} tabular-nums`}>{stats[player.id]?.score}</p></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <a href="https://www.amazon.com/s?k=fishing&tag=werewolf3788-20" target="_blank" rel="noopener noreferrer" className="relative overflow-hidden bg-gradient-to-br from-orange-600/10 via-yellow-600/5 to-orange-600/10 border border-orange-500/20 rounded-[2.5rem] p-10 hover:border-orange-500/50 transition-all group flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-sm shadow-2xl">
              <Waves className="absolute -right-10 -bottom-10 w-64 h-64 text-orange-500/5 rotate-12 pointer-events-none" />
              <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 text-center md:text-left">
                <div className="p-6 bg-orange-500 rounded-[2rem] shadow-2xl shadow-orange-500/20 group-hover:scale-110 transition-transform duration-500"><ShoppingBag className="text-white w-10 h-10" /></div>
                <div><h4 className="font-black text-3xl tracking-tight mb-2 uppercase italic">Gear Up & Support The Squad</h4><p className="text-slate-400 text-base max-w-xl font-medium">Need new fishing gear? Shop top-rated rods, reels, and bait on Amazon via our link. Every purchase helps us keep the live tracker running!</p></div>
              </div>
              <div className="flex flex-col items-center gap-3 relative z-10 w-full md:w-auto">
                <div className="px-10 py-5 bg-orange-500 text-white rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-orange-500/40 group-hover:bg-orange-400 group-hover:translate-y-[-4px] transition-all flex items-center gap-3 w-full md:w-auto justify-center">Shop Fishing Deals<ExternalLink className="w-5 h-5" /></div>
                <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-50">Affiliate Link: Werewolf3788-20</span>
              </div>
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto w-[90%] mt-12 mb-8 flex flex-col md:flex-row justify-between items-center text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] gap-4">
          <div className="flex items-center gap-4"><span>Werewolf3788 - Angler Pro Tracker v2.9</span><span className="w-1 h-1 bg-slate-700 rounded-full"></span><span className="text-green-500/60">Twitch ID Sync Active</span></div>
          <span className="opacity-40 italic">Designed for Pro Anglers</span>
        </div>
      </div>
    );
  }
  return null;
}
