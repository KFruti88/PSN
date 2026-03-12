import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

(function() {
    const firebaseConfig = {
        apiKey: "AIzaSyC55Cb3JcK9NiDkdSHpAS3UuTEG82aze7k",
        authDomain: "angler-squad-tracker.firebaseapp.com",
        projectId: "angler-squad-tracker",
        storageBucket: "angler-squad-tracker.firebasestorage.app",
        messagingSenderId: "325679067980",
        appId: "1:325679067980:web:57edbad70fe12b988355e9"
    };

    const MASTER_ID = 'cotw-master';
    const LEGACY_ID = 'cotw-trophy-display';
    const GITHUB_BASE = 'https://raw.githubusercontent.com/KFruti88/PSN/main/theHunter/map/';
    
    // Map files to fetch
    const mapFiles = [
        'base-game.js',
        'cuatro-colinas.js',
        'medved-taiga-expansion-data.js',
        'parque-fernando.js',
        'silver-ridge-peaks.js',
        'vurhonga_savanna.js',
        'yukon-valley.js'
    ];

    const ICONS = {
        GAME: "https://img.psnprofiles.com/trophy/s/6622/ab71d597-4a98-4891-9f93-5e26fbd42d03.png",
        ARC: "https://img.psnprofiles.com/trophy/s/6622/716af6c9-1cf7-4d32-b567-7c06503e9be6.png",
        PHOTO: "https://img.psnprofiles.com/trophy/s/6622/926946c4-009b-4da6-b01b-2773be793e61.png",
        TRAVEL: "https://img.psnprofiles.com/trophy/s/6622/62637094-d904-493b-9c5f-0a56453e3146.png",
        MARK: "https://img.psnprofiles.com/trophy/s/6622/0c34b625-1c04-4343-bf57-606cad61b625.png",
        TRACK: "https://img.psnprofiles.com/trophy/s/6622/1665d213-9e64-4f4a-8711-d0bd509f618f.png"
    };

    const appState = {
        activeHunter: 'Werewolf3788',
        masterTrophyList: [], // Merged list from GitHub
        hunterData: [],       // Current state for active user
        animalRankData: { bronze: 0, silver: 0, gold: 0, diamond: 0, greatone: 0 },
        hunterMeta: { platform: 'Playstation' },
        auth: null, db: null,
        unsubscribeMaster: null, unsubscribeLegacy: null,
        collapsedSections: {},

        init: async function() {
            // 1. Fetch data from GitHub
            await this.fetchGitHubData();
            
            const saved = localStorage.getItem('cotw_master_active_id');
            if (saved) this.activeHunter = saved;
            
            // Clone the fetched list for local manipulation
            this.hunterData = JSON.parse(JSON.stringify(this.masterTrophyList));
            this.render();

            // 2. Initialize Firebase (Unique Named Instance)
            try {
                const appInstance = initializeApp(firebaseConfig, 'COTW-Master-GlobalSync');
                this.auth = getAuth(appInstance);
                this.db = getFirestore(appInstance);
                await signInAnonymously(this.auth);
                onAuthStateChanged(this.auth, (user) => { if (user) this.loadHunter(this.activeHunter); });
            } catch (err) { console.error("Firebase Auth Error:", err); }
        },

        fetchGitHubData: async function() {
            try {
                const results = await Promise.all(mapFiles.map(file => 
                    fetch(GITHUB_BASE + file).then(res => res.text())
                ));
                
                // Parse the JS arrays (assumes files contain: const x = [...];)
                results.forEach(content => {
                    const dataString = content.substring(content.indexOf('['));
                    const parsed = eval(dataString.substring(0, dataString.lastIndexOf(']') + 1));
                    this.masterTrophyList = [...this.masterTrophyList, ...parsed];
                });
                
                console.log(`Lead Dev Update: ${this.masterTrophyList.length} trophies synced from GitHub.`);
            } catch (err) { console.error("GitHub Sync Error:", err); }
        },

        loadHunter: function(name) {
            if (!this.db || !this.auth.currentUser) return;
            this.activeHunter = name;
            localStorage.setItem('cotw_master_active_id', name);
            document.getElementById('hunter-name').innerText = name;
            document.getElementById('wp-custom-wrapper').className = 'theme-' + (name === 'Werewolf3788' ? 'werewolf' : name === 'Raymystyro' ? 'ray' : 'tj');

            // Snapshot for specific hunter progress
            const masterRef = doc(this.db, 'artifacts', MASTER_ID, 'public', 'data', 'userTrophies', name);
            if (this.unsubscribeMaster) this.unsubscribeMaster();
            this.unsubscribeMaster = onSnapshot(masterRef, (snap) => {
                if (snap.exists()) {
                    const incoming = snap.data().trophies || [];
                    this.hunterData = this.masterTrophyList.map(baseTrophy => {
                        const saved = incoming.find(it => it.id === baseTrophy.id);
                        if (!saved) return baseTrophy;
                        
                        // Handle both nested checklists and simple numeric types
                        if (baseTrophy.type === 'checklist' && saved.subItems) {
                             baseTrophy.subItems = baseTrophy.subItems.map((si, idx) => { 
                                 if (saved.subItems[idx]) si.done = saved.subItems[idx].done; 
                                 return si; 
                             });
                        } else { baseTrophy.current = saved.current || 0; }
                        return baseTrophy;
                    });
                }
                this.render();
            });

            // Legacy Animal Rank Snapshot
            const legacyRef = doc(this.db, 'artifacts', LEGACY_ID, 'public', 'data', 'userTrophies', name);
            if (this.unsubscribeLegacy) this.unsubscribeLegacy();
            this.unsubscribeLegacy = onSnapshot(legacyRef, (snap) => {
                if (snap.exists()) { this.animalRankData = snap.data(); this.updateAnimalRankUI(); }
            });
        },

        sync: async function() {
            if (!this.db || !this.auth.currentUser) return;
            const masterRef = doc(this.db, 'artifacts', MASTER_ID, 'public', 'data', 'userTrophies', this.activeHunter);
            await setDoc(masterRef, { 
                trophies: this.hunterData, 
                platform: this.hunterMeta.platform,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
        },

        // UI Handlers (adj, tog, drop, sub, etc. remain the same as previous logic)
        adj: function(i, a) { this.hunterData[i].current = Math.max(0, this.hunterData[i].current + a); this.render(); this.sync(); },
        tog: function(i) { this.hunterData[i].current = this.hunterData[i].current === 0 ? 1 : 0; this.render(); this.sync(); },
        sub: function(i, si) { this.hunterData[i].subItems[si].done = !this.hunterData[i].subItems[si].done; this.render(); this.sync(); },
        drop: function(id) { document.getElementById(`drop-${id}`).classList.toggle('show'); },
        
        updateAnimalRankUI: function() {
            ['bronze', 'silver', 'gold', 'diamond', 'greatone'].forEach(t => {
                const el = document.getElementById(`rank-val-${t}`);
                if (el) el.innerText = this.animalRankData[t] || 0;
            });
        },

        getIcon: function(t) {
            const n = t.name.toLowerCase();
            if (n.includes('arc') || n.includes('master')) return ICONS.ARC;
            if (n.includes('mile') || n.includes('marathon')) return ICONS.TRAVEL;
            if (n.includes('track') || n.includes('stalker')) return ICONS.TRACK;
            if (n.includes('marksman') || n.includes('hit')) return ICONS.MARK;
            return ICONS.GAME;
        },

        render: function() {
            const container = document.getElementById('section-container');
            const selector = document.getElementById('reserve-selector');
            container.innerHTML = '';
            
            const categories = [...new Set(this.hunterData.map(t => t.cat))];
            
            // Build the Jump-to menu if empty
            if (selector.options.length <= 1) {
                categories.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = 'section-' + cat.replace(/[^a-z0-9]/gi, '');
                    opt.innerText = cat; selector.appendChild(opt);
                });
            }

            let globalMet = 0, globalTotal = 0;

            categories.forEach(cat => {
                const catItems = this.hunterData.filter(t => t.cat === cat);
                let catMet = 0;
                catItems.forEach(item => {
                    if (item.type === 'checklist') item.current = item.subItems.filter(s => s.done).length;
                    if (item.current >= item.goal) catMet++;
                    if (item.plat !== false) { globalTotal++; if (item.current >= item.goal) globalMet++; }
                });

                const sectionId = 'section-' + cat.replace(/[^a-z0-9]/gi, '');
                const isCollapsed = this.collapsedSections[sectionId] !== false;
                const catPercent = Math.round((catMet / catItems.length) * 100);

                const section = document.createElement('div');
                section.className = `category-section ${isCollapsed ? 'section-collapsed' : ''}`;
                section.id = sectionId;
                section.innerHTML = `
                    <div class="category-header" onclick="appState.toggleSection('${sectionId}')">
                        <h2 class="category-title">${cat}</h2>
                        <span class="category-arrow">▼</span>
                    </div>
                    <div class="section-content">
                        <div class="cat-progress-container">
                            <span class="cat-progress-label">PROGRESS: ${catMet} / ${catItems.length} (${catPercent}%)</span>
                            <div class="cat-bar-bg"><div class="cat-bar-fill" style="width: ${catPercent}%"></div></div>
                        </div>
                        <div class="trophy-grid">
                            ${catItems.map((t) => {
                                const gIdx = this.hunterData.findIndex(h => h.id === t.id);
                                const isDone = t.current >= t.goal;
                                return `
                                    <div class="trophy-card ${isDone ? 'completed' : ''}">
                                        <div class="trophy-card-header">
                                            <img src="${this.getIcon(t)}" class="trophy-icon-img">
                                            <div class="trophy-details">
                                                <span class="trophy-rank rank-${t.rank}">${t.rank}</span>
                                                <h3>${t.name}</h3>
                                            </div>
                                        </div>
                                        ${t.type === 'numeric' ? 
                                            `<div class="controls"><button class="btn" onclick="appState.adj(${gIdx},-1)">-</button><span>${t.current}/${t.goal}</span><button class="btn" onclick="appState.adj(${gIdx},1)">+</button></div>` :
                                          t.type === 'checklist' ? 
                                            `<button class="dropdown-trigger" onclick="appState.drop('${t.id}')">Missions (${t.current}/${t.goal})</button>
                                             <div id="drop-${t.id}" class="dropdown-content">
                                                ${t.subItems.map((s, si) => `<div class="sub-item"><span>${s.name}</span><button class="check-btn" onclick="appState.sub(${gIdx},${si})">${s.done?'✓':'OFF'}</button></div>`).join('')}
                                             </div>` : 
                                            `<button class="toggle-btn" onclick="appState.tog(${gIdx})">${isDone?'DONE':'OFF'}</button>`
                                        }
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
                container.appendChild(section);
            });

            const p = globalTotal > 0 ? Math.round((globalMet / globalTotal) * 100) : 0;
            document.getElementById('overall-bar').style.width = p + '%';
            document.getElementById('percent-text').innerText = `Master Platinum Progress ${p}%`;
            document.getElementById('stat-line').innerText = `Cloud Sync: ${this.hunterData.length} Detailed Trophies Loaded`;
        },

        toggleSection: function(id) { this.collapsedSections[id] = !this.collapsedSections[id]; this.render(); },
        scrollToCategory: function(id) { if(id) { this.collapsedSections[id] = false; this.render(); document.getElementById(id).scrollIntoView({behavior:'smooth'}); } }
    };

    window.appState = appState;
    appState.init();
})();
