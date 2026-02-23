<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>

<script>
    // 1. Firebase Configuration (Your specific keys)
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

    // 3. Squad Order
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
                    <h2 class="text-xl font-black text-white uppercase tracking-tighter">${player.name}</h2>
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

        // Listen to the root "catches" collection for live updates
        PLAYERS.forEach(player => {
            db.collection('catches').doc(player.id).onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    TIERS.forEach(tier => {
                        const el = document.getElementById(`val-${player.id}-${tier}`);
                        if (el) el.innerText = data[tier] || 0;
                    });
                }
            }, (error) => {
                console.error("Firestore Listen Error:", error);
            });
        });
    }

    // Run Auth then Sync
    auth.signInAnonymously()
        .then(() => {
            console.log("Authenticated");
            startLiveSync();
        })
        .catch((err) => {
            console.error("Auth Error:", err);
            document.getElementById('display-container').innerHTML = 
                `<p class="text-red-500 text-center font-bold">Connection Failed: ${err.message}</p>`;
        });
</script>
