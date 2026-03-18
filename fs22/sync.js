/**
 * FS22 G-Portal to Firebase Bridge
 * Save as: sync.js
 */
(function() {
    const admin = require('firebase-admin');
    const axios = require('axios');
    const xml2js = require('xml2js');

    // Named instance for your project
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const fs22App = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    }, 'fs22SyncInstance');

    const db = fs22App.firestore();
    const GPORTAL_XML = "http://209.126.0.100:8080/feed/dedicated-server-stats.xml?code=DIaoyx8jutkGtlDr";
    const GPORTAL_MAP = "http://209.126.0.100:8080/feed/dedicated-server-stats-map.jpg?code=DIaoyx8jutkGtlDr&quality=60&size=512";

    async function runSync() {
        try {
            // 1. Get the XML Data
            const response = await axios.get(GPORTAL_XML);
            const result = await xml2js.parseStringPromise(response.data);
            const server = result.dedicatedServer;

            // 2. Prepare the data packet
            const data = {
                serverName: server.$.name,
                mapName: server.$.mapName,
                playersOnline: parseInt(server.players[0].$.matched),
                maxPlayers: parseInt(server.players[0].$.capacity),
                mapUrl: GPORTAL_MAP, // Link directly to the live image
                lastCheck: admin.firestore.FieldValue.serverTimestamp()
            };

            // 3. Push to Firebase
            await db.collection('servers').doc('fs22_live').set(data, { merge: true });
            console.log("Reckon the farm is synced up!");
            process.exit(0);
        } catch (err) {
            console.error("Dern it, failed:", err);
            process.exit(1);
        }
    }

    runSync();
})();
