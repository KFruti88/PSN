const firebase = require('firebase/app');
require('firebase/firestore');
const Parser = require('rss-parser');

(async function() {
    /**
     * PROTECTIVE SCOPE & INITIALIZATION
     * Using your preferred named instance and IIFE pattern.
     */
    const parser = new Parser();

    // Pulling the config from the GitHub Actions Environment Secret
    let firebaseConfig;
    try {
        firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    } catch (e) {
        console.error("Error parsing FIREBASE_CONFIG secret. Make sure it's valid JSON.");
        process.exit(1);
    }

    // Initialize with a unique name as per your requirements
    const app = firebase.initializeApp(firebaseConfig, 'AnglerSquadSyncInstance');
    const db = firebase.firestore(app);

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
     * Loops through each user and checks their latest 10 trophies.
     */
    async function syncUserTrophies(user) {
        try {
            console.log(`--- Starting Sync for ${user.handle} ---`);
            const feed = await parser.parseURL(user.rss);

            // We check the top 10 items to ensure no overlap is missed between cron runs
            const recentItems = feed.items.slice(0, 10);

            for (const item of recentItems) {
                for (const [gameTitle, firestorePath] of Object.entries(gameMapping)) {
                    
                    // Case-insensitive check to handle variations in naming
                    if (item.title.toLowerCase().includes(gameTitle.toLowerCase())) {
                        console.log(`Match Found: ${user.handle} earned [${item.title}]`);

                        // Platform detection for FS22 (PS4 vs PS5)
                        const platform = item.title.includes("(PS5)") ? "PS5" : "PS4";

                        // Targeted document: e.g., artifacts/fs22-master/public/data/user_profiles/Werewolf3788
                        const docRef = db.doc(`${firestorePath}/${user.handle}`);

                        await docRef.set({
                            last_trophy: item.title,
                            last_updated: new Date().toISOString(),
                            link: item.link,
                            platform: platform,
                            sync_source: "GitHub Action RSS Bridge"
                        }, { merge: true }); // Merge keeps existing user profile data safe
                    }
                }
            }
        } catch (error) {
            console.error(`Sync failed for ${user.handle}:`, error.message);
        }
    }

    // Run sync for both users simultaneously
    await Promise.all(users.map(syncUserTrophies));
    
    console.log("--- All Syncs Complete ---");
    process.exit(0);
})();
