const firebase = require('firebase/app');
require('firebase/firestore');
const Parser = require('rss-parser');

(async function() {
    const parser = new Parser();

    // Use environment variable for security in GitHub Actions, 
    // but keep your specific values as the structure.
    const firebaseConfig = {
        apiKey: "AIzaSyC55Cb3JcK9NiDkdSHpAS3UuTEG82aze7k",
        authDomain: "angler-squad-tracker.firebaseapp.com",
        projectId: "angler-squad-tracker",
        storageBucket: "angler-squad-tracker.firebasestorage.app",
        messagingSenderId: "325679067980",
        appId: "1:325679067980:web:57edbad70fe12b988355e9"
    };

    // Named instance for Angler Squad Tracker
    const app = firebase.initializeApp(firebaseConfig, 'anglerSquadInstance');
    const db = firebase.firestore(app);

    const users = [
        { handle: 'Werewolf3788', rss: 'https://psntrophyleaders.com/user/view/Werewolf3788/rss' },
        { handle: 'Raymystyro', rss: 'https://psntrophyleaders.com/user/view/OneLIVIDMAN/rss' }
    ];

    // Mapping games to the specific Firestore paths you provided
    const gameMapping = {
        "theHunter: Call of the Wild": "artifacts/cotw-master/public/data/userTrophies",
        "Farming Simulator 22": "artifacts/fs22-master/public/data/user_profiles",
        "Farming Simulator 25": "artifacts/fs25-master/public/data/userTrophies"
    };

    async function syncUser(user) {
        try {
            console.log(`Checking feed for ${user.handle}...`);
            const feed = await parser.parseURL(user.rss);

            // Check the last 10 trophies so we don't miss anything between timer runs
            const recentItems = feed.items.slice(0, 10);

            for (const item of recentItems) {
                for (const [gameTitle, firestorePath] of Object.entries(gameMapping)) {
                    if (item.title.includes(gameTitle)) {
                        console.log(`Match: ${user.handle} earned a trophy in ${gameTitle}`);

                        const docRef = db.doc(`${firestorePath}/${user.handle}`);
                        
                        await docRef.set({
                            last_trophy: item.title,
                            last_updated: new Date().toISOString(),
                            link: item.link,
                            // Catching if it's PS4 or PS5 for FS22
                            platform: item.title.includes("(PS5)") ? "PS5" : "PS4"
                        }, { merge: true });
                    }
                }
            }
        } catch (error) {
            console.error(`Error syncing ${user.handle}:`, error.message);
        }
    }

    await Promise.all(users.map(syncUser));
    console.log("Sync process complete.");
    process.exit(0);
})();
