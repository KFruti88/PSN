/**
 * FS22 G-Portal to Firebase Realtime Database Bridge
 * Save as: fs22/sync.js
 * Author: Werewolf3788
 * Version: 3.0 (Absolute Maximum Telemetry - Chicago Sync)
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

    const getAttr = (obj, attr) => obj?.$?.[attr] || obj?.[attr] || null;

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

            // 1. ANIMALS & HUSBANDRY (Slurry, Health, Population)
            const animalPens = [];
            const pList = placeables?.placeables?.placeable || [];
            
            pList.forEach(p => {
                const type = getAttr(p, 'type');
                if (type && (type.includes('husbandry') || type.includes('Animal'))) {
                    const storage = [];
                    const h = getChild(p, 'husbandryAnimals') || getChild(p, 'husbandryFood');
                    
                    // Extract slurry/manure/milk levels
                    const modules = p.husbandryAnimals?.[0]?.modules?.[0]?.module || [];
                    modules.forEach(m => {
                        if (m.$.fillType) {
                            storage.push({
                                type: m.$.fillType,
                                amount: Math.round(parseFloat(m.$.fillLevel || 0))
                            });
                        }
                    });

                    animalPens.push({
                        name: getAttr(p, 'modName') || "Animal Pen",
                        type: type.split('.').pop(),
                        health: Math.round(parseFloat(getChild(p, 'husbandryAnimals')?.$.health || 0)),
                        population: parseInt(getChild(p, 'husbandryAnimals')?.$.numAnimals || 0),
                        storage: storage
                    });
                }
            });

            // 2. FLEET & TRAILERS (Fuel, Damage, Wear)
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

            // 3. FIELDS (Growth, Lime, Fert, Plow, Cultivate)
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

            // 4. COLLECTIBLES & AI STATUS
            const statistics = getChild(getChild(career, 'careerSavegame'), 'statistics');
            const collectibles = {
                found: parseInt(statistics?.foundCollectibles?.[0] || 0),
                total: 100 // Zielonka/Elmcreek standard
            };

            // 5. PERSONNEL (Human + Admin check)
            const slots = getChild(serverInfo, 'Slots') || getChild(serverInfo, 'players');
            const players = (slots?.Player || []).map(p => ({
                name: p.$.name,
                isAdmin: p.$.isAdmin === 'true' || p.$.isAdmin === true,
                farmId: p.$.farmId || "1"
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
            console.log(`Sync Successful. Chicago Time: ${payload.lastUpdated}. Found ${animalPens.length} pens.`);
            process.exit(0);
        } catch (error) {
            console.error("Telemetry pipeline failed:", error.message);
            process.exit(1);
        }
    }

    runFarmAudit();
})();
