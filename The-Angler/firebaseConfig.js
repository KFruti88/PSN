<script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
    import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

    // --- 1. YOUR FIREBASE CONFIG ---
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT.appspot.com",
        messagingSenderId: "YOUR_MESSAGING_ID",
        appId: "YOUR_APP_ID"
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    const appId = 'angler-tracker-v1';

    // Reordered: TJ first, Werewolf second, Ray third
    const PLAYERS = [
        { id: 'terrdog420', name: 'terrdog420', img: 'https://static-cdn.jtvnw.net/jtv_user_pictures/9dad426e-04cb-4fc0-a917-25982b3800ce-profile_image-70x70.png' },
        { id: 'Werewolf3788', name: 'Werewolf3788', img: 'https://static-cdn.jtvnw.net/jtv_user_pictures/1a4efdb4-023e-4802-b07c-82c09a45c4c8-profile_image-70x70.png' },
        { id: 'Raymystyro', name: 'Raymystyro', img: 'https://static-cdn.jtvnw.net/jtv_user_pictures/032a0367-589f-4763-94de-4fc679a0b2df-profile_image-70x70.png' }
    ];

    const TIERS = ['legendary', 'diamond', 'gold', 'silver', 'bronze'];

    // --- 2. THE SYNC LOGIC ---
    async function startLiveSync() {
        const container = document.getElementById('display-container');
        
        // Build the HTML structure first
        container.innerHTML = PLAYERS.map(player => `
            <div class="player-row flex flex-col xl:flex-row items-center gap-6">
                <div class="flex items-center gap-4 min-w-[220px] w-full xl:w-auto mb-2 xl:mb-0">
                    <img src="${player.img}" class="w-14 h-14 rounded-full border-2 border-purple-500 shadow-lg" />
                    <h2 class="text-xl font-black text-white uppercase tracking-tighter">${player.name}</h2>
                </div>
                
                <div class="stat-grid grid grid-cols-5 gap-3 flex-1 w-full">
                    ${TIERS.map(tier => `
                        <div class="stat-card border-white/5 ${tier === 'legendary' ? 'legendary-card' : ''}">
                            <span class="tier-label ${tier}">${tier}</span>
                            <div id="val-${player.id}-${tier}" class="tier-val ${tier}">0</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // Listen to Firebase for each player
        PLAYERS.forEach(player => {
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'catches', player.id);
            
            onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // Update each tier for this player
                    TIERS.forEach(tier => {
                        // Firebase uses Capitalized tiers usually, let's normalize
                        const tierKey = tier.charAt(0).toUpperCase() + tier.slice(1);
                        const el = document.getElementById(`val-${player.id}-${tier}`);
                        if (el) {
                            el.innerText = data[tierKey] || 0;
                        }
                    });
                }
            });
        });
    }

    // --- 3. RUN IT ---
    signInAnonymously(auth).then(() => {
        startLiveSync();
    }).catch(err => {
        console.error("Auth Error:", err);
        document.getElementById('display-container').innerHTML = `<p class="text-red-500 text-center">Connection Failed</p>`;
    });
</script>
