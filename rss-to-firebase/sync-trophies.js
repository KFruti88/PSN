const admin = require('firebase-admin');
const Parser = require('rss-parser');

(async function() {
    const parser = new Parser();

    /**
     * INITIALIZATION & SECRET HANDLING
     */
    const rawConfig = process.env.FIREBASE_CONFIG ? process.env.FIREBASE_CONFIG.trim() : null;

    if (!rawConfig) {
        console.error("CRITICAL ERROR: The secret 'FIREBASE_CONFIG' was not found.");
        process.exit(1);
    }

    let firebaseConfig;
    try {
        firebaseConfig = JSON.parse(rawConfig);
    } catch (e) {
        console.error("CRITICAL ERROR: FIREBASE_CONFIG is not valid JSON.");
        console.error("Error Detail:", e.message);
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

    /**
     * SYNC LOGIC
     */
    async function syncUserTrophies(user) {
        try {
            console.log(`\n--- Starting Sync for ${user.handle} ---`);
            const feed = await parser.parseURL(user.rss);
            const recentItems = feed.items.slice(0, 10);

            for (const item of recentItems) {
                for (const [gameTitle, firestorePath] of Object.entries(gameMapping)) {
                    
                    if (item.title.toLowerCase().includes(gameTitle.toLowerCase())) {
                        
                        // Extract trophy name and clean it for Firestore keys
                        const rawTrophyName = item.title.split(' - ')[1] || item.title;
                        const trophyId = rawTrophyName
                            .replace(/\(PS4\)|\(PS5\)/g, '')
                            .trim()
                            .toLowerCase()
                            .replace(/\s+/g, '_')
                            .replace(/[^a-z0-9_]/g, '');

                        console.log(`[MATCH] ${user.handle} earned: ${trophyId}`);

                        const docRef = db.doc(`${firestorePath}/${user.handle}`);

                        // Update the map structure with isEarned: true
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

    // Run all syncs
    await Promise.all(users.map(syncUserTrophies));
    
    console.log("\n--- All Syncs Complete. Closing Instance. ---");
    process.exit(0);
})(); // This closing line is vital!
