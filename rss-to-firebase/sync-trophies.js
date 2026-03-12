(function() {
    // ... initial setup same as before ...

    const gameMapping = {
        "theHunter: Call of the Wild": "artifacts/cotw-master/public/data/userTrophies",
        "Farming Simulator 22": "artifacts/fs22-master/public/data/user_profiles",
        "Farming Simulator 25": "artifacts/fs25-master/public/data/userTrophies"
    };

    async function processUserFeeds(user) {
        const feed = await parser.parseURL(user.rss);
        
        for (const item of feed.items) {
            for (const [gameTitle, firestorePath] of Object.entries(gameMapping)) {
                // This catches "Farming Simulator 22 (PS4)" and "Farming Simulator 22 (PS5)"
                if (item.title.includes(gameTitle)) {
                    
                    // Determine platform for your own records/overlays
                    const platform = item.title.includes("(PS5)") ? "PS5" : "PS4";

                    const docRef = db.doc(`${firestorePath}/${user.handle}`);

                    await docRef.set({
                        last_trophy: item.title,
                        platform: platform, // Now you know which console triggered it!
                        last_updated: new Date().toISOString(),
                        game: gameTitle
                    }, { merge: true });
                }
            }
        }
    }
    // ... rest of script ...
})();
