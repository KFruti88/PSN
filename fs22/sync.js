/**
 * FS22 G-Portal to Firebase Realtime Database Bridge (Ultra-Robust Version)
 * Save as: fs22/sync.js
 * Author: Werewolf3788
 */
(function() {
    const admin = require('firebase-admin');
    const axios = require('axios');
    const xml2js = require('xml2js');

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.error("Error: FIREBASE_SERVICE_ACCOUNT secret is missing.");
        process.exit(1);
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://psn-fs22-overlay-default-rtdb.firebaseio.com"
        }, 'fs22SyncInstance');
    }

    const db = admin.app('fs22SyncInstance').database();
    const CODE = "hLySOix9lKRmd86O";
    const BASE_URL = "http://209.126.0.100:8080/feed/";

    const URLS = {
        STATS: `${BASE_URL}dedicated-server-stats.xml?code=${CODE}`,
        CAREER: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=careerSavegame`,
        VEHICLES: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=vehicles`,
        ECONOMY: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=economy`,
        MAP: `${BASE_URL}dedicated-server-stats-map.jpg?code=${CODE}&quality=60&size=512`
    };

    const getChild = (obj, key) => {
        const val = obj?.[key];
        return Array.isArray(val) ? val[0] : val;
    };

    const getAttr = (obj, attr) => obj?.$?.[attr] || obj?.[attr] || null;

    async function runFarmAudit() {
        console.log("Auditing '618 crew' telemetry...");

        try {
            const fetch = async (url) => axios.get(url).then(r => r.data).catch(() => null);
            const [statsRaw, careerRaw, vehicleRaw, economyRaw] = await Promise.all([
                fetch(URLS.STATS), fetch(URLS.CAREER), fetch(URLS.VEHICLES), fetch(URLS.ECONOMY)
            ]);

            const parse = async (raw) => raw ? xml2js.parseStringPromise(raw).catch(() => ({})) : {};
            const stats = await parse(statsRaw);
            const career = await parse(careerRaw);
            const vehicles = await parse(vehicleRaw);
            const economy = await parse(economyRaw);

            const serverInfo = stats?.Server || stats?.dedicatedServer;
            const serverName = getAttr(serverInfo, 'name') || "618 crew";
            const mapName = getAttr(serverInfo, 'mapName') || "Elmcreek";
            const mapSize = parseInt(getAttr(serverInfo, 'mapSize') || 2048);

            const slots = getChild(serverInfo, 'Slots') || getChild(serverInfo, 'players');
            const onlineCount = parseInt(getAttr(slots, 'numUsed') || getAttr(slots, 'matched') || 0);
            const maxSlots = parseInt(getAttr(slots, 'capacity') || 0);

            // Extract vehicle positions for the map overlay
            const fleetInfo = getChild(serverInfo, 'Vehicles') || getChild(vehicles, 'vehicles');
            const rawVehicles = fleetInfo?.Vehicle || fleetInfo?.vehicle || [];
            
            const processedVehicles = rawVehicles.map(v => ({
                name: getAttr(v, 'name'),
                category: getAttr(v, 'category'),
                x: parseFloat(getAttr(v, 'x') || 0),
                z: parseFloat(getAttr(v, 'z') || 0)
            }));

            const marketPrices = [];
            const economyRoot = getChild(economy, 'economy');
            if (economyRoot?.item) {
                economyRoot.item.slice(0, 4).forEach(item => {
                    marketPrices.push({ 
                        type: getAttr(item, 'fillType'), 
                        price: Math.round(parseFloat(getAttr(item, 'price')) * 1000) 
                    });
                });
            }

            const careerRoot = getChild(career, 'careerSavegame');
            const farmName = getChild(careerRoot, 'settings')?.savegameName?.[0] || "618 crew";
            const moneyVal = getChild(careerRoot, 'farm')?.money?.[0] || getChild(careerRoot, 'statistics')?.money?.[0] || 0;
            
            const payload = {
                server: {
                    name: serverName,
                    map: mapName,
                    mapSize: mapSize,
                    online: onlineCount,
                    max: maxSlots,
                    players: slots?.Player ? 
                             slots.Player.filter(p => p.$?.name).map(p => p.$.name) : 
                             (slots?.player ? slots.player.map(p => p.$.name) : [])
                },
                career: {
                    name: farmName,
                    money: parseInt(moneyVal),
                    playTime: Math.round(parseFloat(getChild(careerRoot, 'statistics')?.playTime?.[0] || 0) / 60)
                },
                fleet: { 
                    total: processedVehicles.length,
                    vehicles: processedVehicles 
                },
                market: marketPrices,
                media: { mapUrl: URLS.MAP },
                lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
            };

            await db.ref('fs22_live').set(payload);
            console.log(`Sync successful: '${serverName}' updated with vehicle positions.`);
            process.exit(0);
        } catch (error) {
            console.error("Sync failed:", error.message);
            process.exit(1);
        }
    }
    runFarmAudit();
})();
