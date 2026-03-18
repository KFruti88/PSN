/**
 * FS22 G-Portal to Firebase Realtime Database Bridge
 * Save as: fs22/sync.js
 * Author: Werewolf3788
 * Version: 2.5 (Maximum Telemetry - Chicago Sync)
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
        console.log("Commencing Maximum Telemetry Audit for '618 crew'...");

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

            // 1. FLEET & TRAILERS (Fuel, Damage, Operating Hours)
            const vRoot = getChild(vehicles, 'vehicles') || getChild(serverInfo, 'Vehicles');
            const vList = vRoot?.vehicle || vRoot?.Vehicle || [];
            const liveFleet = vList.map(v => {
                const damage = parseFloat(getAttr(v, 'damageLevel') || 0);
                const fuel = parseFloat(getAttr(v, 'fuelLevel') || 0);
                const operatingTime = parseFloat(getAttr(v, 'operatingTime') || 0);
                const isTrailer = getAttr(v, 'category')?.toLowerCase().includes('trailer') || false;

                return {
                    name: getAttr(v, 'name'),
                    category: getAttr(v, 'category'),
                    farmId: getAttr(v, 'farmId') || "1",
                    x: parseFloat(getAttr(v, 'x') || 0),
                    z: parseFloat(getAttr(v, 'z') || 0),
                    fillType: getAttr(v, 'fillTypes') || "Empty",
                    fillLevel: Math.round(parseFloat(getAttr(v, 'fillLevels') || 0)),
                    fuel: Math.round(fuel),
                    damage: Math.round(damage * 100),
                    hours: (operatingTime / 3600).toFixed(1),
                    type: getAttr(v, 'name')?.toLowerCase().includes('wagon') ? 'world' : 'owned',
                    isTrailer: isTrailer
                };
            });

            // 2. FACTORIES, GREENHOUSES & STORAGE (Pallets, Slurry, Silos)
            const pList = placeables?.placeables?.placeable || [];
            const factories = [];
            const silos = [];

            pList.forEach(p => {
                const type = getAttr(p, 'type');
                const pos = p.position ? p.position[0].$ : { x: 0, z: 0 };
                
                // Silo Storage
                if (type && type.includes('silo')) {
                    const storage = [];
                    const pp = getChild(p, 'productionPoint') || p;
                    if (pp?.storage?.[0]?.node) {
                        pp.storage[0].node.forEach(n => {
                            storage.push({ type: n.$.fillType, amount: Math.round(parseFloat(n.$.fillLevel)) });
                        });
                    }
                    silos.push({ name: getAttr(p, 'modName') || "Silo", storage: storage });
                }

                // Production (Factories / Greenhouses)
                if (type && (type.includes('productionPoint') || type.includes('greenhouse'))) {
                    const storage = [];
                    const pp = getChild(p, 'productionPoint');
                    if (pp?.storage?.[0]?.node) {
                        pp.storage[0].node.forEach(n => {
                            storage.push({ 
                                type: n.$.fillType, 
                                amount: Math.round(parseFloat(n.$.fillLevel)),
                                capacity: Math.round(parseFloat(n.$.capacity || 0))
                            });
                        });
                    }
                    factories.push({
                        name: getAttr(p, 'modName') || "Production",
                        x: parseFloat(pos.x),
                        z: parseFloat(pos.z),
                        storage: storage,
                        isGreenhouse: type.includes('greenhouse')
                    });
                }
            });

            // 3. FIELD DATA (Growth, Lime, Fertilizer, Plow, Cultivate)
            const fieldRecords = [];
            const fList = getChild(farmland, 'farmlands')?.farmland || [];
            const saveFields = getChild(career, 'careerSavegame')?.fields?.[0]?.field || [];

            fList.forEach(f => {
                const id = getAttr(f, 'id');
                const ownerId = getAttr(f, 'farmId');
                // Link with savegame field status
                const status = saveFields.find(sf => getAttr(sf, 'id') === id) || {};

                fieldRecords.push({
                    id: id,
                    farmId: ownerId,
                    growth: getAttr(status, 'growthState') || "1",
                    fertilizer: getAttr(status, 'fertilizerLevel') || "0",
                    lime: getAttr(status, 'limeLevel') || "0",
                    plow: getAttr(status, 'plowLevel') || "0",
                    cultivate: getAttr(status, 'weedLevel') || "0", // Weed level often used as cultivation proxy in API
                    fruit: getAttr(status, 'fruitType') || "Empty"
                });
            });

            // 4. PERSONNEL & FARMS
            const slots = getChild(serverInfo, 'Slots') || getChild(serverInfo, 'players');
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
                    online: parseInt(getAttr(slots, 'numUsed') || 0),
                    max: parseInt(getAttr(slots, 'capacity') || 6),
                    players: (slots?.Player || []).map(p => ({
                        name: p.$.name,
                        isAdmin: p.$.isAdmin === 'true' || p.$.isAdmin === true
                    })),
                    farms: farmsData
                },
                fleet: { total: liveFleet.length, vehicles: liveFleet },
                factories: factories,
                fields: fieldRecords,
                silos: silos,
                lastUpdated: new Date().toLocaleString("en-US", { 
                    timeZone: "America/Chicago",
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                }),
                media: { mapUrl: URLS.MAP }
            };

            await db.ref('fs22_live').set(payload);
            console.log(`Sync Successful. Chicago Time: ${payload.lastUpdated}`);
            process.exit(0);
        } catch (error) {
            console.error("Telemetry pipeline failed:", error.message);
            process.exit(1);
        }
    }

    runFarmAudit();
})();
