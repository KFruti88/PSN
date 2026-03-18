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
    // This pulls the JSON key you pasted into GitHub Secrets
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            // Your specific Realtime Database URL
            databaseURL: "https://psn-fs22-overlay-default-rtdb.firebaseio.com"
        }, 'fs22SyncInstance');
    }

    const db = admin.app('fs22SyncInstance').database();

    // 2. G-Portal API Configuration
    // Using the updated security code you provided
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
            // Simultaneous fetch of all textual data streams
            const [statsRes, careerRes, vehicleRes, economyRes] = await Promise.all([
                axios.get(URLS.STATS),
                axios.get(URLS.CAREER),
                axios.get(URLS.VEHICLES),
                axios.get(URLS.ECONOMY)
            ]);

            // Parse XML data streams into JSON objects
            const stats = await xml2js.parseStringPromise(statsRes.data);
            const career = await xml2js.parseStringPromise(careerRes.data);
            const vehicles = await xml2js.parseStringPromise(vehicleRes.data);
            const economy = await xml2js.parseStringPromise(economyRes.data);

            const serverInfo = stats.dedicatedServer;
            const careerData = career.careerSavegame;
            
            // Calculate Fleet Totals (Motorized units vs Attachments)
            const totalVehicles = vehicles.vehicles.vehicle ? vehicles.vehicles.vehicle.length : 0;
            const totalAttachments = vehicles.vehicles.attachment ? vehicles.vehicles.attachment.length : 0;

            // Extract Top 4 Market Prices
            const marketPrices = [];
            if (economy.economy && economy.economy.item) {
                economy.economy.item.slice(0, 4).forEach(item => {
                    marketPrices.push({
                        type: item.$.fillType,
                        price: Math.round(parseFloat(item.$.price) * 1000)
                    });
                });
            }

            // Build consolidated data packet for the website
            const payload = {
                server: {
                    name: serverInfo.$.name || "Offline",
                    map: serverInfo.$.mapName || "Standard Map",
                    online: parseInt(serverInfo.players[0].$.matched) || 0,
                    max: parseInt(serverInfo.players[0].$.capacity) || 0,
                    players: serverInfo.players[0].player ? serverInfo.players[0].player.map(p => p.$.name) : []
                },
                career: {
                    name: careerData.settings[0].savegameName[0] || "PSN Farm",
                    money: parseInt(careerData.farm[0].money[0]) || 0,
                    playTime: Math.round(parseFloat(careerData.statistics[0].playTime[0]) / 60)
                },
                fleet: {
                    total: totalVehicles,
                    attachments: totalAttachments
                },
                market: marketPrices,
                media: {
                    mapUrl: URLS.MAP
                },
                // Timestamp in US Eastern Time
                lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
            };

            // Update the 'fs22_live' node in Realtime Database
            await db.ref('fs22_live').set(payload);
            
            console.log("Sync successful. Realtime Database updated.");
            process.exit(0);

        } catch (error) {
            console.error("Sync failed:", error.message);
            process.exit(1);
        }
    }

    runFarmAudit();
})();
