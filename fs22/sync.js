/**
 * FS22 G-Portal to Firebase Realtime Database Bridge
 * Save as: fs22/sync.js
 * Author: Werewolf3788
 * Version: 3.1 (Fixed Attribute Access - Chicago Sync)
 */
(function() {
    const admin = require('firebase-admin');
    const axios = require('axios');
    const xml2js = require('xml2js');

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.error("Critical: FIREBASE_SERVICE_ACCOUNT secret is missing.");
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

    const CODE = "CVzQ6vUR4l7iRtH4";
    const BASE_URL = "http://207.244.227.124:8130/feed/";

    const URLS = {
        STATS: `${BASE_URL}dedicated-server-stats.xml?code=${CODE}`,
        CAREER: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=careerSavegame`,
        VEHICLES: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=vehicles`,
        PLACEABLES: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=placeables`,
        FARMLAND: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=farmland`,
        ECONOMY: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=economy`,
        MAP: `${BASE_URL}dedicated-server-stats-map.jpg?code=${CODE}&quality=60&size=512`
    };

    const getChild = (obj, key) => {
        const val = obj?.[key];
        return Array.isArray(val) ? val[0] : val;
    };

    // Robust attribute fetcher to prevent "undefined" crashes
    const getAttr = (obj, attr) => {
        if (!obj) return null;
        if (obj.$ && obj.$[attr] !== undefined) return obj.$[attr];
        if (obj[attr] !== undefined) return obj[attr];
        return null;
    };

    async function runFarmAudit() {
        console.log("Commencing Full System Telemetry Audit for '618 crew'...");

        try {
            const fetch = async (url) => axios.get(url).then(r => r.data).catch(() => null);
            const [statsRaw, careerRaw, vehicleRaw, placeRaw, farmRaw, economyRaw] = await Promise.all([
                fetch(URLS.STATS), fetch(URLS.CAREER), fetch(URLS.VEHICLES), fetch(URLS.PLACEABLES), fetch(URLS.FARMLAND), fetch(URLS.ECONOMY)
            ]);

            const parse = async (raw) => raw ? xml2js.parseStringPromise(raw).catch(() => ({})) : {};
            const stats = await parse(statsRaw);
            const career = await parse(careerRaw);
            const vehicles = await parse(vehicleRaw);
            const placeables = await parse(placeRaw);
            const farmland = await parse(farmRaw);
            const economy = await parse(economyRaw);

            const serverInfo = stats?.Server || stats?.dedicatedServer;
            const mapSize = parseInt(getAttr(serverInfo, 'mapSize') || 2048);

            // 1. ANIMALS & HUSBANDRY
            const animalPens = [];
            const pList = placeables?.placeables?.placeable || [];
            
            pList.forEach(p => {
                const type = getAttr(p, 'type');
                if (type && (type.includes('husbandry') || type.includes('Animal'))) {
                    const storage = [];
                    const hNode = getChild(p, 'husbandryAnimals');
                    
                    const modules = hNode?.modules?.[0]?.module || [];
                    modules.forEach(m => {
                        const fType = getAttr(m, 'fillType');
                        if (fType) {
                            storage.push({
                                type: fType,
                                amount: Math.round(parseFloat(getAttr(m, 'fillLevel') || 0))
                            });
                        }
                    });

                    animalPens.push({
                        name: getAttr(p, 'modName') || "Animal Pen",
                        type: type.split('.').pop(),
                        health: Math.round(parseFloat(getAttr(hNode, 'health') || 0)),
                        population: parseInt(getAttr(hNode, 'numAnimals') || 0),
                        storage: storage
                    });
                }
            });

            // 2. FLEET & TRAILERS
            const vRoot = getChild(vehicles, 'vehicles') || getChild(serverInfo, 'Vehicles');
            const vList = vRoot?.vehicle || vRoot?.Vehicle || [];
            const liveFleet = vList.map(v => ({
                name: getAttr(v, 'name'),
                category: getAttr(v, 'category'),
                farmId: getAttr(v, 'farmId') || "1",
                x: parseFloat(getAttr(v, 'x') || 0),
                z: parseFloat(getAttr(v, 'z') || 0),
                fillType: getAttr(v, 'fillTypes') || "Empty",
                fillLevel: Math.round(parseFloat(getAttr(v, 'fillLevels') || 0)),
                fuel: Math.round(parseFloat(getAttr(v, 'fuelLevel') || 0)),
                damage: Math.round(parseFloat(getAttr(v, 'damageLevel') || 0) * 100),
                hours: (parseFloat(getAttr(v, 'operatingTime') || 0) / 3600).toFixed(1),
                type: getAttr(v, 'name')?.toLowerCase().includes('wagon') ? 'world' : 'owned'
            }));

            // 3. FIELDS
            const fieldRecords = [];
            const saveFields = getChild(career, 'careerSavegame')?.fields?.[0]?.field || [];
            saveFields.forEach(f => {
                fieldRecords.push({
                    id: getAttr(f, 'id'),
                    farmId: getAttr(f, 'farmId') || "0",
                    growth: getAttr(f, 'growthState') || "1",
                    fertilizer: getAttr(f, 'fertilizerLevel') || "0",
                    lime: getAttr(f, 'limeLevel') || "0",
                    plow: getAttr(f, 'plowLevel') || "0",
                    fruit: getAttr(f, 'fruitType') || "Bare"
                });
            });

            // 4. COLLECTIBLES
            const statistics = getChild(getChild(career, 'careerSavegame'), 'statistics');
            const collectibles = {
                found: parseInt(getChild(statistics, 'foundCollectibles') || 0),
                total: 100
            };

            // 5. PERSONNEL (Safe Attribute Mapping)
            const slots = getChild(serverInfo, 'Slots') || getChild(serverInfo, 'players');
            const playerEntries = slots?.Player || slots?.player || [];
            const players = playerEntries.map(p => ({
                name: getAttr(p, 'name') || p._ || "Unknown",
                isAdmin: getAttr(p, 'isAdmin') === 'true' || getAttr(p, 'isAdmin') === true,
                farmId: getAttr(p, 'farmId') || "1"
            }));

            // 6. MULTI-FARM LIQUIDITY
            const farmList = career?.careerSavegame?.farms?.[0]?.farm || [];
            const farmsData = farmList.filter(f => getAttr(f, 'farmId') !== "0").map(f => ({
                id: getAttr(f, 'farmId'),
                name: getAttr(f, 'name'),
                money: parseInt(getChild(f, 'money') || 0)
            }));

            const payload = {
                server: {
                    name: getAttr(serverInfo, 'name') || "618 crew",
                    map: getAttr(serverInfo, 'mapName') || "Elmcreek",
                    mapSize: mapSize,
                    online: players.length,
                    max: parseInt(getAttr(slots, 'capacity') || 6),
                    players: players,
                    farms: farmsData
                },
                animals: animalPens,
                fleet: { total: liveFleet.length, vehicles: liveFleet },
                fields: fieldRecords,
                collectibles: collectibles,
                mods: (getChild(serverInfo, 'mods')?.mod || []).map(m => getAttr(m, 'filename')),
                lastUpdated: new Date().toLocaleString("en-US", { 
                    timeZone: "America/Chicago",
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                }),
                media: { mapUrl: URLS.MAP }
            };

            await db.ref('fs22_live').set(payload);
            console.log(`Sync Successful. Chicago Time: ${payload.lastUpdated}.`);
            process.exit(0);
        } catch (error) {
            console.error("Telemetry pipeline failed:", error.message);
            process.exit(1);
        }
    }

    runFarmAudit();
})();
