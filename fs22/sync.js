/**
 * FS22 G-Portal to Firebase Realtime Database Bridge
 * Save as: fs22/sync.js
 * Author: Werewolf3788
 */
(function() {
    const admin = require('firebase-admin');
    const axios = require('axios');
    const xml2js = require('xml2js');

    // 1. Initialize Firebase Admin using GitHub Secret
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.error("Error: FIREBASE_SERVICE_ACCOUNT secret is missing in GitHub.");
        process.exit(1);
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        console.error("Error: The FIREBASE_SERVICE_ACCOUNT secret is not valid JSON.");
        process.exit(1);
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://psn-fs22-overlay-default-rtdb.firebaseio.com"
        }, 'fs22SyncInstance');
    }

    const db = admin.app('fs22SyncInstance').database();

    // 2. G-Portal API Configuration
    const CODE = "hLySOix9lKRmd86O";
    const BASE_URL = "http://209.126.0.100:8080/feed/";

    const URLS = {
        STATS: `${BASE_URL}dedicated-server-stats.xml?code=${CODE}`,
        CAREER: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=careerSavegame`,
        VEHICLES: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=vehicles`,
        ECONOMY: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=economy`,
        MAP: `${BASE_URL}dedicated-server-stats-map.jpg?code=${CODE}&quality=60&size=512`
    };

    async function runFarmAudit() {
        console.log("Commencing full farm data sync...");

        try {
            // Fetch all data sources. We use .catch() on each to ensure one failed 
            // file (like an empty savegame after reset) doesn't kill the whole sync.
            const fetch = async (url) => axios.get(url).then(r => r.data).catch(e => null);

            const [statsRaw, careerRaw, vehicleRaw, economyRaw] = await Promise.all([
                fetch(URLS.STATS),
                fetch(URLS.CAREER),
                fetch(URLS.VEHICLES),
                fetch(URLS.ECONOMY)
            ]);

            // Parse what we can, return empty object if null
            const parse = async (raw) => raw ? xml2js.parseStringPromise(raw).catch(() => ({})) : {};

            const stats = await parse(statsRaw);
            const career = await parse(careerRaw);
            const vehicles = await parse(vehicleRaw);
            const economy = await parse(economyRaw);

            const serverInfo = stats?.dedicatedServer;
            const careerData = career?.careerSavegame;
            
            // Safe checks for fleet - will stay 0 if the file is empty/missing
            const totalVehicles = vehicles?.vehicles?.vehicle ? vehicles.vehicles.vehicle.length : 0;
            const totalAttachments = vehicles?.vehicles?.attachment ? vehicles.vehicles.attachment.length : 0;

            // Safe checks for Market Prices
            const marketPrices = [];
            if (economy?.economy?.item) {
                economy.economy.item.slice(0, 4).forEach(item => {
                    marketPrices.push({
                        type: item.$.fillType,
                        price: Math.round(parseFloat(item.$.price) * 1000)
                    });
                });
            }

            // Build consolidated data packet
            const payload = {
                server: {
                    name: serverInfo?.$.name || "Online (Initializing)",
                    map: serverInfo?.$.mapName || "Loading Map...",
                    online: parseInt(serverInfo?.players[0]?.$.matched) || 0,
                    max: parseInt(serverInfo?.players[0]?.$.capacity) || 0,
                    players: serverInfo?.players[0]?.player ? serverInfo.players[0].player.map(p => p.$.name) : []
                },
                career: {
                    name: careerData?.settings?.[0]?.savegameName?.[0] || "New Savegame",
                    money: parseInt(careerData?.farm?.[0]?.money?.[0]) || 0,
                    playTime: Math.round(parseFloat(careerData?.statistics?.[0]?.playTime?.[0]) / 60) || 0
                },
                fleet: {
                    total: totalVehicles,
                    attachments: totalAttachments
                },
                market: marketPrices,
                media: {
                    mapUrl: URLS.MAP
                },
                lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
            };

            // Update the 'fs22_live' node
            await db.ref('fs22_live').set(payload);
            
            console.log("Sync successful. Database updated with available telemetry.");
            process.exit(0);

        } catch (error) {
            console.error("Sync failed:", error.message);
            process.exit(1);
        }
    }

    runFarmAudit();
})();
