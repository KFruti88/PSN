const admin = require('firebase-admin');
const Parser = require('rss-parser');

(async function() {
    /**
     * PROTECTIVE SCOPE & INITIALIZATION
     */
    const parser = new Parser();

    // Pulling the config from the GitHub Actions Environment Secret
    let firebaseConfig;
    try {
        firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    } catch (e) {
        console.error("CRITICAL ERROR: FIREBASE_CONFIG secret is missing or invalid JSON.");
        process.exit(1);
    }

    // Initialize using the Admin SDK for Node.js stability
    // Uses your required named instance pattern
    const app = admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
        // Dynamically sets the URL based on your Project ID
        databaseURL: `https://${firebaseConfig.project_id}.firebaseio.com`
    }, 'AnglerSquadSyncInstance');

    const db = admin.firestore(app);

    // User handles and their specific RSS feeds
    const users = [
        { 
            handle: 'Werewolf3788', 
            rss: 'https://psntrophyleaders.com/user/view/Werewolf3788/rss' 
        },
        { 
            handle: 'Raymystyro', 
            rss: 'https://psntrophyleaders.com/user/view/OneLIVIDMAN/rss' 
        }
    ];

    // Mapping game titles found in RSS to your specific Firestore paths
    const gameMapping = {
        "theHunter: Call of the Wild": "artifacts/cotw-master/public/data/userTrophies",
        "Farming Simulator 22": "artifacts/fs22-master/public/data/user_profiles",
        "Farming Simulator 25": "artifacts/fs25-master/public/data/userTrophies"
    };

    /**
     * SYNC LOGIC
     */
    async function syncUserTrophies(user) {
        try {
            console.log(`\n--- Starting Sync for ${user.handle} ---`);
            const feed = await parser.parseURL(user.rss);

            // Check the top 10 items to ensure no trophies are missed between runs
            const recentItems = feed.items.slice(0, 10);

            for (const item of recentItems) {
                for (const [gameTitle, firestorePath] of Object.entries(gameMapping)) {
                    
                    // Case-insensitive check to handle variations
                    if (item.title.toLowerCase().includes(gameTitle.toLowerCase())) {
                        console.log(`[MATCH] ${user.handle}: ${item.title}`);

                        // Platform detection for FS22 (PS4 vs PS5)
                        const platform = item.title.includes("(PS5)") ? "PS5" : "PS4";

                        // Target document path
                        const docRef = db.doc(`${firestorePath}/${user.handle}`);

                        await docRef.set({
                            last_trophy: item.title,
                            last_updated: new Date().toISOString(),
                            link: item.link,
                            platform: platform,
                            sync_source: "GitHub Action RSS Bridge"
                        }, { merge: true });
                    }
                }
            }
        } catch (error) {
            console.error(`[ERROR] Sync failed for ${user.handle}:`, error.message);
        }
    }

    // Execute sync for all users
    await Promise.all(users.map(syncUserTrophies));
    
    console.log("\n--- All Syncs Complete. Closing Instance. ---");
    process.exit(0);
})();
