const admin = require('firebase-admin');
const Parser = require('rss-parser');

(async function() {
    const parser = new Parser();

    let firebaseConfig;
    try {
        firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    } catch (e) {
        console.error("CRITICAL ERROR: FIREBASE_CONFIG secret is missing or invalid JSON.");
        process.exit(1);
    }

    const app = admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
        databaseURL: `https://${firebaseConfig.project_id}.firebaseio.com`
    }, 'AnglerSquadSyncInstance');

    const db = admin.firestore(app);

    const users = [
        { handle: 'Werewolf3788', rss: 'https://psntrophyleaders.com/user/view/Werewolf3788/rss' },
        { handle: 'Raymystyro', rss: 'https://psntrophyleaders.com/user/view/OneLIVIDMAN/rss' }
    ];

    const gameMapping = {
        "theHunter: Call of the Wild": "artifacts/cotw-master/public/data/userTrophies",
        "Farming Simulator 22": "artifacts/fs22-master/public/data/userTrophies",
        "Farming Simulator 25": "artifacts/fs25-master/public/data/userTrophies"
    };

    async function syncUserTrophies(user) {
        try {
            console.log(`\n--- Starting Sync for ${user.handle} ---`);
            const feed = await parser.parseURL(user.rss);
            const recentItems = feed.items.slice(0, 10);

            for (const item of recentItems) {
                for (const [gameTitle, firestorePath] of Object.entries(gameMapping)) {
                    
                    if (item.title.toLowerCase().includes(gameTitle.toLowerCase())) {
                        // 1. Extract the trophy name only (removes the game title and platform)
                        // Example: "Allez Hopp (PS5)" becomes "allez_hopp"
                        const rawTrophyName = item.title.split(' - ')[1] || item.title;
                        const trophyId = rawTrophyName
                            .replace(/\(PS4\)|\(PS5\)/g, '') // Remove platform tags
                            .trim()
                            .toLowerCase()
                            .replace(/\s+/g, '_')           // Replace spaces with underscores
                            .replace(/[^a-z0-9_]/g, '');    // Remove special characters

                        console.log(`[MATCH] ${user.handle} earned: ${trophyId}`);

                        const docRef = db.doc(`${firestorePath}/${user.handle}`);

                        // 2. Update the document using the Map structure
                        // This adds/updates the specific trophy map without overwriting others
                        await docRef.set({
                            [trophyId]: {
                                isEarned: true,
                                last_updated: new Date().toISOString(),
                                platform: item.title.includes("(PS5)") ? "PS5" : "PS4"
                            }
                        }, { merge: true });
                    }
                }
            }
        } catch (error) {
            console.error(`[ERROR] Sync failed for ${user.handle}:`, error.message);
        }
    }

    await Promise.all(users.map(syncUserTrophies));
    console.log("\n--- All Syncs Complete. Closing Instance. ---");
    process.exit(0);
})();
