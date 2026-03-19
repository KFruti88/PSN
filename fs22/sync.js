/**
 * FS22 G-Portal to Firebase Realtime Database Bridge
 * Save as: fs22/sync.js
 * Author: Werewolf3788
 * Version: 5.4 (Restored Firebase Connectivity)
 */
(function() {
    const admin = require('firebase-admin');
    const axios = require('axios');
    const xml2js = require('xml2js');

    // GitHub Secrets Handling
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.error("❌ CONNECTION ERROR: FIREBASE_SERVICE_ACCOUNT secret is missing.");
        process.exit(1);
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        console.error("❌ FORMAT ERROR: FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
        process.exit(1);
    }

    // Initialize using the named instance pattern to avoid conflicts
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://psn-fs22-overlay-default-rtdb.firebaseio.com"
        }, 'fs22SyncInstance');
    }

    const db = admin.app('fs22SyncInstance').database();
    
    // SERVER CONFIG
    const CODE = "CVzQ6vUR4l7iRtH4";
    const BASE_URL = "http://154.12.236.77:8650/feed/";

    const URLS = {
        STATS: `${BASE_URL}dedicated-server-stats.xml?code=${CODE}`,
        VEHICLES: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=vehicles`,
        CAREER: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=careerSavegame`,
        ENV: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=environment`
    };

    const getChild = (obj, key) => { const val = obj?.[key]; return Array.isArray(val) ? val[0] : val; };
    const getAttr = (obj, attr) => {
        if (!obj) return null;
        if (obj.$ && obj.$[attr] !== undefined) return obj.$[attr];
        return obj[attr] !== undefined ? obj[attr] : null;
    };

    async function runFarmAudit() {
        console.log("🛰️ Initiating Uplink v5.4...");
        try {
            const fetch = async (url) => axios.get(url).then(r => r.data).catch(() => null);

            const [statsR, vehicleR, careerR, envR] = await Promise.all([
                fetch(URLS.STATS), fetch(URLS.VEHICLES), 
                fetch(URLS.CAREER), fetch(URLS.ENV)
            ]);

            const parse = async (raw) => raw ? xml2js.parseStringPromise(raw).catch(() => ({})) : {};
            const stats = await parse(statsR);
            const vData = await parse(vehicleR);
            const career = await parse(careerR);
            const environment = await parse(envR);

            // Accessing the root server node - adjusting for common G-Portal XML variations
            const serverInfo = stats?.Server || stats?.dedicatedServer;

            // Weather Logic
            let weatherStatus = "CLEAR";
            const envRoot = environment?.environment;
            if (envRoot?.weather) {
                const current = getChild(envRoot.weather, 'currentWeather') || getChild(envRoot.weather, 'forecast');
                weatherStatus = getAttr(current, 'typeName') || getAttr(getChild(current, 'instance'), 'typeName') || "CLEAR";
            }

            const careerRoot = career?.careerSavegame;
            const foundCollectibles = parseInt(getAttr(careerRoot, 'foundCollectibles') || 0);

            const payload = {
                collectibles: {
                    found: foundCollectibles,
                    total: 100
                },
                fleet: {
                    total: (vData?.vehicles?.vehicle || vData?.vehicles?.Vehicle || []).length
                },
                server: {
                    name: getAttr(serverInfo, 'name') || "618 Crew",
                    map: getAttr(serverInfo, 'mapName') || "Elmcreek",
                    mapSize: 2048,
                    online: parseInt(serverInfo?.Slots?.[0]?.$.numUsed || 0),
                    gameTime: getAttr(serverInfo, 'dayTime') || "00:00",
                    weather: weatherStatus.toUpperCase(),
                    players: (serverInfo?.Slots?.[0]?.Player || []).map(p => ({ 
                        name: p._ || p.$.name, 
                        isAdmin: p.$.isAdmin === 'true'
                    }))
                },
                media: {
                    mapUrl: `${BASE_URL}dedicated-server-stats-map.jpg?code=${CODE}&quality=60&size=512`
                },
                lastUpdated: new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago" })
            };

            // Using .update() at the root path to ensure the connection works
            await db.ref('fs22_live').update(payload);
            
            console.log("✅ DATA PUSHED SUCCESSFULLY. Sync restored.");
            process.exit(0);
        } catch (e) {
            console.error("❌ CRITICAL SYNC FAILURE:", e.message);
            process.exit(1);
        }
    }
    runFarmAudit();
})();
