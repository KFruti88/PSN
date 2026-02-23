<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>

<script>
    // 1. Firebase Configuration (Specific to angler-squad-tracker)
    const firebaseConfig = {
        apiKey: "AIzaSyC55Cb3JcK9NiDkdSHpAS3UuTEG82aze7k",
        authDomain: "angler-squad-tracker.firebaseapp.com",
        projectId: "angler-squad-tracker",
        storageBucket: "angler-squad-tracker.firebasestorage.app",
        messagingSenderId: "325679067980",
        appId: "1:325679067980:web:57edbad70fe12b988355e9"
    };

    // 2. Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();

    // 3. Squad Order (TJ, Werewolf3788, Raymystyro)
    const PLAYERS = [
        { id: 'terrdog420', name: 'terrdog420', img: 'https://static-cdn.jtvnw.net/jtv_user_pictures/9dad426e-04cb-4fc0-a917-25982b3800ce-profile_image-70x70.png' },
        { id: 'Werewolf3788', name: 'Werewolf3788', img: 'https://static-cdn.jtvnw.net/jtv_user_pictures/1a4efdb4-023e-4802-b07c-82c09a45c4c8-profile_image-70x70.png' },
        { id: 'Raymystyro', name: 'Raymystyro', img: 'https://static-cdn.jtvnw.net/jtv_user_pictures/032a0367-589f-4763-94de-4fc679a0b2df-profile_image-70x70.png' }
    ];

    const TIERS = ['Legendary', 'Diamond', 'Gold', 'Silver', 'Bronze'];

    async function startLiveSync() {
        const container = document.getElementById('display-container');
        
        // Build the UI rows
        container.innerHTML = PLAYERS.map(player => `
            <div class="player-row flex flex-col xl:flex-row items-center gap-6">
                <div class="flex items-center gap-4 min-w-[220px] w-full xl:w-auto">
                    <img src="${player.img}" class="w-14 h-14 rounded-full border-2 border-purple-500 shadow-lg" />
                    <div>
                        <h2 class="text-xl font-black text-white uppercase tracking-tighter">${player.name}</h2>
                        <div id="game-${player.id}" class="text-[10px] text-gray-500 italic uppercase tracking-widest">Checking Status...</div>
                    </div>
                </div>
                <div class="grid grid-cols-5 gap-3 flex-1 w-full">
                    ${TIERS.map(tier => `
                        <div class="stat-card border-white/5">
                            <span class="tier-label ${tier.toLowerCase()}">${tier}</span>
                            <div id="val-${player.id}-${tier}" class="tier-val ${tier.toLowerCase()}">0</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // Listen for live database updates & Twitch status
        PLAYERS.forEach(player => {
            // Firestore Listen
            db.collection('catches').doc(player.id).onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    TIERS.forEach(tier => {
                        const el = document.getElementById(`val-${player.id}-${tier}`);
                        if (el) el.innerText = data[tier] || 0;
                    });
                }
            }, (error) => {
                console.error("Firestore Error:", error);
            });

            // Initial Game Status Check
            updateGameStatus(player.id);
        });

        // Set interval to check Twitch status every 60 seconds
        setInterval(() => {
            PLAYERS.forEach(player => updateGameStatus(player.id));
        }, 60000);
    }

    async function updateGameStatus(playerId) {
        try {
            const res = await fetch(`https://decapi.me/twitch/game/${playerId}`);
            const game = await res.text();
            const el = document.getElementById(`game-${playerId}`);
            if (el) {
                const isOff = game.toLowerCase().includes('offline') || game.includes('not found');
                el.innerText = isOff ? 'Offline' : 'Live: ' + game;
                el.className = isOff ? 'text-[10px] text-gray-500 italic uppercase tracking-widest' : 'text-[10px] text-purple-400 font-bold italic uppercase tracking-widest';
            }
        } catch (e) {
            console.error("Twitch API Error:", e);
        }
    }

    // Run Anonymous Auth then Sync
    auth.signInAnonymously()
        .then(() => {
            console.log("Database Connected");
            startLiveSync();
        })
        .catch((err) => {
            console.error("Auth Error:", err);
            const container = document.getElementById('display-container');
            if (container) {
                container.innerHTML = `<p class="text-red-500 text-center font-bold">Connection Failed: ${err.message}</p>`;
            }
        });
</script>
