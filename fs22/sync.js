/**
 * FS22 G-Portal to Firebase Realtime Database Bridge
 * Save as: fs22/sync.js
 * Author: Werewolf3788
 */
(function() {
    const admin = require('firebase-admin');
    const axios = require('axios');
    const xml2js = require('xml2js');

    // 1. Pull the Secret from GitHub Environment
    // Make sure you named your Secret 'FIREBASE_SERVICE_ACCOUNT' in GitHub Settings
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    // 2. Initialize the Named Instance for Realtime Database
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://psn-fs22-overlay-default-rtdb.firebaseio.com"
        }, 'fs22SyncInstance');
    }

    const db = admin.app('fs22SyncInstance').database();

    // 3. Your G-Portal API Links
    const GPORTAL_XML = "http://209.126.0.100:8080/feed/dedicated-server-stats.xml?code=DIaoyx8jutkGtlDr";
    const GPORTAL_MAP = "http://209.126.0.100:8080/feed/dedicated-server-stats-map.jpg?code=DIaoyx8jutkGtlDr&quality=60&size=512";

    async function runSync() {
        console.log("Checking the crops and mashing the data...");

        try {
            // Fetch the XML
            const response = await axios.get(GPORTAL_XML);
            const result = await xml2js.parseStringPromise(response.data);
            const server = result.dedicatedServer;

            // Build the data packet
            const farmData = {
                serverName: server.$.name || "Offline",
                mapName: server.$.mapName || "Unknown",
                players: {
                    online: parseInt(server.players[0].$.matched) || 0,
                    max: parseInt(server.players[0].$.capacity) || 0,
                    list: server.players[0].player ? server.players[0].player.map(p => p.$.name) : []
                },
                liveMapUrl: GPORTAL_MAP,
                lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
            };

            // 4. Update the Realtime Database at 'fs22_live'
            await db.ref('fs22_live').set(farmData);
            
            console.log("Reckon the farm is synced up tight!");
            process.exit(0);

        } catch (error) {
            console.error("Dern it, the tractor stalled:", error.message);
            process.exit(1);
        }
    }

    runSync();
})();
