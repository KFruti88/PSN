/**
 * FS22 G-Portal to Firebase Bridge
 * Author: Werewolf3788
 * Purpose: Syncs G-Portal XML and Map data to Firebase Firestore
 */
(function() {
    const admin = require('firebase-admin');
    const axios = require('axios');
    const xml2js = require('xml2js');

    // 1. Setup the Secret from GitHub Environment
    // This looks for the 'FIREBASE_SERVICE_ACCOUNT' secret you added to GitHub
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    // 2. Initialize Firebase with a named instance
    // Replace 'your-project-id' with your actual Firebase Project ID
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
        }, 'fs22SyncInstance');
    }

    const db = admin.app('fs22SyncInstance').firestore();

    // 3. Your G-Portal API Links
    const GPORTAL_XML = "http://209.126.0.100:8080/feed/dedicated-server-stats.xml?code=DIaoyx8jutkGtlDr";
    const GPORTAL_MAP = "http://209.126.0.100:8080/feed/dedicated-server-stats-map.jpg?code=DIaoyx8jutkGtlDr&quality=60&size=512";

    async function runFarmSync() {
        console.log("Checking the fences... starting sync.");

        try {
            // Fetch the XML feed from G-Portal
            const response = await axios.get(GPORTAL_XML);
            const result = await xml2js.parseStringPromise(response.data);
            const server = result.dedicatedServer;

            // Prepare the data packet for Firebase
            const farmData = {
                status: {
                    online: server.$.Name !== "", // If name exists, server is up
                    serverName: server.$.name,
                    mapName: server.$.mapName,
                    version: server.$.version,
                    language: server.$.language
                },
                players: {
                    current: parseInt(server.players[0].$.matched),
                    max: parseInt(server.players[0].$.capacity),
                    list: server.players[0].player || [] // Lists names of folks in-game
                },
                media: {
                    liveMap: GPORTAL_MAP
                },
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            };

            // Push to Firestore 'servers' collection, document 'fs22_live'
            await db.collection('servers').doc('fs22_live').set(farmData, { merge: true });
            
            console.log("Reckon the data is synced up tight! Farm is live.");
            process.exit(0);

        } catch (error) {
            console.error("Dern it, sync failed:", error.message);
            process.exit(1);
        }
    }

    // Run the function
    runFarmSync();

})();
