/**
 * FS22 G-Portal to Firebase Realtime Database Bridge
 * Save as: fs22/sync.js
 */
(function() {
    const admin = require('firebase-admin');
    const axios = require('axios');
    const xml2js = require('xml2js');

    // 1. Grab the Secret from GitHub
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    // 2. Initialize using your specific Realtime Database URL
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            // This matches the link you just sent me
            databaseURL: "https://psn-fs22-overlay-default-rtdb.firebaseio.com"
        }, 'fs22SyncInstance');
    }

    const db = admin.app('fs22SyncInstance').database();

    // 3. Your G-Portal API Links
    const GPORTAL_XML = "http://209.126.0.100:8080/feed/dedicated-server-stats.xml?code=DIaoyx8jutkGtlDr";
    const GPORTAL_MAP = "http://209.126.0.100:8080/feed/dedicated-server-stats-map.jpg?code=DIaoyx8jutkGtlDr&quality=60&size=512";

    async function runFarmSync() {
        console.log("Mashing the data together...");

        try {
            const response = await axios.get(GPORTAL_XML);
            const result = await xml2js.parseStringPromise(response.data);
            const server = result.dedicatedServer;

            const farmData = {
                serverName: server.$.name,
                mapName: server.$.mapName,
                playersOnline: parseInt(server.players[0].$.matched),
                maxPlayers: parseInt(server.players[0].$.capacity),
                mapUrl: GPORTAL_MAP,
                lastUpdated: new Date().toISOString()
            };

            // 4. Push to Realtime Database at the 'fs22_live' node
            await db.ref('fs22_live').set(farmData);
            
            console.log("Reckon it's done! Check your Firebase Console.");
            process.exit(0);

        } catch (error) {
            console.error("Dern it, failed:", error.message);
            process.exit(1);
        }
    }

    runFarmSync();
})();
