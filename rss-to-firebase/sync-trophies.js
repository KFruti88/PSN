const admin = require('firebase-admin');
const Parser = require('rss-parser');

(async function() {
    /**
     * PROTECTIVE SCOPE & INITIALIZATION
     */
    const parser = new Parser();

    // Pulling the config from the GitHub Actions Environment Secret
    const rawConfig = process.env.FIREBASE_CONFIG ? process.env.FIREBASE_CONFIG.trim() : null;

    if (!rawConfig) {
        console.error("CRITICAL ERROR: The secret 'FIREBASE_CONFIG' was not found.");
        process.exit(1);
    }

    let firebaseConfig;
    try {
        firebaseConfig = JSON.parse(rawConfig);
        
        // AGGRESSIVE HEALING LOGIC
        if (firebaseConfig.private_key) {
            // First, convert literal "\n" strings to real newlines
            let key = firebaseConfig.private_key.replace(/\\n/g, '\n');
            
            // Second, if the key is all one line, rebuild the PEM structure
            if (!key.includes('\n')) {
                key = key.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
                         .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----\n');
            }
            
            firebaseConfig.private_key = key;
        }
    } catch (e) {
        console.error("CRITICAL ERROR: FIREBASE_CONFIG is not valid JSON.");
        console.error("Error Detail:", e.message);
        process.exit(1);
    }

    // Initialize using the Admin SDK with your required named instance
    const app = admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
        databaseURL: `https://${firebaseConfig.project_id}.firebaseio.com`
    }, 'AnglerSquadSyncInstance');

    const db = admin.firestore(app);

    // User handles and their specific RSS feeds (Only you and Ray for now)
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

            // Check the top 10 items to ensure no trophies are missed between runs
            const recentItems = feed.items.slice(0, 10);

            for (const item of recentItems) {
                for (const [gameTitle, firestorePath] of Object.entries(gameMapping)) {
                    
                    // Case-insensitive check to handle variations
                    if (item.title.toLowerCase().includes(gameTitle.toLowerCase())) {
                        
                        // Clean the trophy name for Firestore (e.g., "Allez Hopp" -> "allez_hopp")
                        const rawTrophyName = item.title.split(' - ')[1] || item.title;
                        const trophyId = rawTrophyName
                            .replace(/\(PS4\)|\(PS5\)/g, '')
                            .trim()
                            .toLowerCase()
                            .replace(/\s+/g, '_')
                            .replace(/[^a-z0-9_]/g, '');

                        console.log(`[MATCH] ${user.handle} earned: ${trophyId}`);

                        const docRef = db.doc(`${firestorePath}/${user.handle}`);

                        // Update the map structure with isEarned: true to match your UI
                        await docRef.set({
                            [trophyId]: {
                                isEarned: true,
                                last_updated: new Date().toISOString(),
                                platform: item.title.includes("(PS5)") ? "PS5" : "PS4",
                                sync_source: "GitHub Action RSS Bridge"
                            }
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
