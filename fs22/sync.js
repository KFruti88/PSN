/**
 * FS22 G-Portal to Firebase Bridge (Pro Version)
 * Save as: fs22/sync.js
 * Author: Werewolf3788
 */
(function() {
    const admin = require('firebase-admin');
    const axios = require('axios');
    const xml2js = require('xml2js');

    // 1. Setup the Secret from GitHub Environment
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    // 2. Initialize the Named Instance for Realtime Database
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://psn-fs22-overlay-default-rtdb.firebaseio.com"
        }, 'fs22SyncInstance');
    }

    const db = admin.app('fs22SyncInstance').database();

    // 3. G-Portal API Links with the updated code
    const CODE = "hLySOix9lKRmd86O";
    const BASE_URL = "http://209.126.0.100:8080/feed/";

    const URLS = {
        STATS: `${BASE_URL}dedicated-server-stats.xml?code=${CODE}`,
        CAREER: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=careerSavegame`,
        VEHICLES: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=vehicles`,
        ECONOMY: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=economy`,
        MAP: `${BASE_URL}dedicated-server-stats-map.jpg?code=${CODE}&quality=60&size=512`
    };

    async function runFullSync() {
        console.log("Starting full farm audit...");

        try {
            // Fetch all 4 data feeds simultaneously
            const [statsRes, careerRes, vehicleRes, economyRes] = await Promise.all([
                axios.get(URLS.STATS),
                axios.get(URLS.CAREER),
                axios.get(URLS.VEHICLES),
                axios.get(URLS.ECONOMY)
            ]);

            // Parse all feeds
            const statsXml = await xml2js.parseStringPromise(statsRes.data);
            const careerXml = await xml2js.parseStringPromise(careerRes.data);
            const vehicleXml = await xml2js.parseStringPromise(vehicleRes.data);
            const economyXml = await xml2js.parseStringPromise(economyRes.data);

            const server = statsXml.dedicatedServer;
            const career = careerXml.careerSavegame;
            
            // Process Vehicle Data (Counting total vehicles and tools)
            const vehicleCount = vehicleXml.vehicles.vehicle ? vehicleXml.vehicles.vehicle.length : 0;
            const attachmentCount = vehicleXml.vehicles.attachment ? vehicleXml.vehicles.attachment.length : 0;

            // Process Economy Data (Getting top crop prices)
            const prices = [];
            if (economyXml.economy && economyXml.economy.item) {
                // Take the first 4 high-value items
                economyXml.economy.item.slice(0, 4).forEach(item => {
                    prices.push({
                        type: item.$.fillType,
                        price: Math.round(parseFloat(item.$.price) * 1000) // Price per 1000L
                    });
                });
            }

            const farmData = {
                server: {
                    name: server.$.name || "Offline",
                    map: server.$.mapName || "N/A",
                    online: parseInt(server.players[0].$.matched) || 0,
                    max: parseInt(server.players[0].$.capacity) || 0,
                    players: server.players[0].player ? server.players[0].player.map(p => p.$.name) : []
                },
                career: {
                    name: career.settings[0].savegameName[0] || "My Farm",
                    money: parseInt(career.farm[0].money[0]) || 0,
                    playTime: Math.round(parseFloat(career.statistics[0].playTime[0]) / 60)
                },
                fleet: {
                    total: vehicleCount,
                    attachments: attachmentCount
                },
                market: prices,
                media: {
                    mapUrl: URLS.MAP
                },
                lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
            };

            // Update Firebase
            await db.ref('fs22_live').set(farmData);
            
            console.log("Full sync successful. Database updated.");
            process.exit(0);

        } catch (error) {
            console.error("Sync process failed:", error.message);
            process.exit(1);
        }
    }

    runFullSync();
})();
