/**
 * FS22 G-Portal to Firebase Realtime Database Bridge
 * Save as: fs22/sync.js
 * Author: Werewolf3788
 * Version: 3.6 (Full Spectrum - Chicago Sync)
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
    const BASE_URL = "http://154.12.236.77:8650/feed/";

    const URLS = {
        STATS: `${BASE_URL}dedicated-server-stats.xml?code=${CODE}`,
        CAREER: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=careerSavegame`,
        VEHICLES: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=vehicles`,
        PLACEABLES: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=placeables`,
        FARMLAND: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=farmland`,
        COLLECTIBLES: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=collectibles`,
        ECONOMY: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=economy`,
        MAP: `${BASE_URL}dedicated-server-stats-map.jpg?code=${CODE}&quality=60&size=512`
    };

    const TIP_TYPES = {
        "1": "WHEAT", "2": "BARLEY", "3": "OAT", "4": "CANOLA", "5": "SORGHUM",
        "6": "GRAPE", "7": "OLIVE", "8": "SUNFLOWER", "9": "SOYBEAN", "10": "MAIZE",
        "11": "POTATO", "12": "SUGARBEET", "13": "SUGARBEET_CUT", "14": "COTTON",
        "15": "SUGARCANE", "16": "SEEDS", "17": "FORAGE", "18": "CHAFF", "19": "WOODCHIPS",
        "20": "SILAGE", "21": "GRASS_WINDROW", "22": "DRYGRASS_WINDROW", "23": "STRAW",
        "24": "SNOW", "25": "ROADSALT", "26": "FERTILIZER", "27": "MANURE", "28": "PIGFOOD",
        "29": "TARP", "30": "LIME", "31": "STONE"
    };

    const getChild = (obj, key) => {
        const val = obj?.[key];
        return Array.isArray(val) ? val[0] : val;
    };

    const getAttr = (obj, attr) => {
        if (!obj) return null;
        if (obj.$ && obj.$[attr] !== undefined) return obj.$[attr];
        if (obj[attr] !== undefined) return obj[attr];
        return null;
    };

    async function runFarmAudit() {
        console.log("Commencing Full Spectrum Telemetry Audit (v3.6)...");

        try {
            const fetch = async (url) => axios.get(url).then(r => r.data).catch(() => null);
            const [statsRaw, careerRaw, vehicleRaw, placeRaw, farmRaw, collectRaw] = await Promise.all([
                fetch(URLS.STATS), fetch(URLS.CAREER), fetch(URLS.VEHICLES), fetch(URLS.PLACEABLES), fetch(URLS.FARMLAND), fetch(URLS.COLLECTIBLES)
            ]);

            const parse = async (raw) => raw ? xml2js.parseStringPromise(raw).catch(() => ({})) : {};
            const stats = await parse(statsRaw);
            const career = await parse(careerRaw);
            const vehicles = await parse(vehicleRaw);
            const placeables = await parse(placeRaw);
            const farmland = await parse(farmRaw);
            const collectiblesData = await parse(collectRaw);

            const serverInfo = stats?.Server || stats?.dedicatedServer;
            const mapSize = parseInt(getAttr(serverInfo, 'mapSize') || 2048);

            // 1. COLLECTIBLES SCAN
            const collectibleItems = collectiblesData?.collectibles?.collectible || [];
            const foundCount = collectibleItems.filter(c => getAttr(c, 'collected') === 'true').length;
            const totalPossible = collectibleItems.length || 100;

            // 2. FLEET & TRAILERS
            const vRoot = getChild(vehicles, 'vehicles') || getChild(serverInfo, 'Vehicles');
            const vList = vRoot?.vehicle || vRoot?.Vehicle || [];
            const liveFleet = vList.map(v => {
                const rawName = getAttr(v, 'name');
                const rawCat = getAttr(v, 'category');
                const cleanName = rawName || rawCat || "Farm Equipment";
                
                let fillType = getAttr(v, 'fillTypes') || "Empty";
                if (!isNaN(fillType) && TIP_TYPES[fillType]) { fillType = TIP_TYPES[fillType]; }

                return {
                    name: cleanName,
                    category: rawCat || "Tools",
                    farmId: getAttr(v, 'farmId') || "1",
                    x: parseFloat(getAttr(v, 'x') || 0),
                    z: parseFloat(getAttr(v, 'z') || 0),
                    fillType: fillType,
                    fillLevel: Math.round(parseFloat(getAttr(v, 'fillLevels') || 0)),
                    fuel: Math.round(parseFloat(getAttr(v, 'fuelLevel') || 0)),
                    damage: Math.round(parseFloat(getAttr(v, 'damageLevel') || 0) * 100),
                    hours: (parseFloat(getAttr(v, 'operatingTime') || 0) / 3600).toFixed(1),
                    type: cleanName.toLowerCase().includes('wagon') ? 'world' : 'owned'
                };
            });

            // 3. FACTORIES & GREENHOUSES
            const factories = [];
            const pList = placeables?.placeables?.placeable || [];
            pList.forEach(p => {
                const type = getAttr(p, 'type');
                if (type && (type.includes('productionPoint') || type.includes('greenhouse'))) {
                    const pos = p.position ? p.position[0].$ : { x: 0, z: 0 };
                    const storage = [];
                    const ppNode = getChild(p, 'productionPoint');
                    
                    if (ppNode?.storage?.[0]?.node) {
                        ppNode.storage[0].node.forEach(node => {
                            storage.push({
                                type: node.$.fillType,
                                amount: Math.round(parseFloat(node.$.fillLevel)),
                                capacity: Math.round(parseFloat(node.$.capacity || 0))
                            });
                        });
                    }

                    factories.push({
                        name: getAttr(p, 'modName') || "Factory",
                        farmId: getAttr(p, 'farmId') || "1",
                        x: parseFloat(pos.x),
                        z: parseFloat(pos.z),
                        storage: storage,
                        active: ppNode?.production ? ppNode.production.some(pr => pr.$.isEnabled === 'true') : false
                    });
                }
            });

            // 4. FINANCIALS & FARMS
            const careerRoot = getChild(career, 'careerSavegame');
            const farmList = careerRoot?.farms?.[0]?.farm || [];
            const farmsData = farmList.filter(f => getAttr(f, 'farmId') !== "0").map(f => ({
                id: getAttr(f, 'farmId'),
                name: getAttr(f, 'name') || "Active Farm",
                money: parseInt(getChild(f, 'money') || 0)
            }));

            if (farmsData.length === 0) {
                const statsBlock = getChild(careerRoot, 'statistics');
                const moneyVal = getChild(statsBlock, 'money') || 0;
                farmsData.push({ id: "1", name: "618 crew", money: parseInt(moneyVal) });
            }

            // 5. PERSONNEL
            const slots = getChild(serverInfo, 'Slots') || getChild(serverInfo, 'players');
            const playerEntries = slots?.Player || slots?.player || [];
            const players = playerEntries.map(p => ({
                name: getAttr(p, 'name') || p._ || "Worker",
                isAdmin: getAttr(p, 'isAdmin') === 'true' || getAttr(p, 'isAdmin') === true,
                farmId: getAttr(p, 'farmId') || "1"
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
                fleet: { total: liveFleet.length, vehicles: liveFleet },
                factories: factories,
                collectibles: { found: foundCount, total: totalPossible },
                mods: (getChild(serverInfo, 'mods')?.mod || []).map(m => getAttr(m, 'filename')),
                lastUpdated: new Date().toLocaleString("en-US", { 
                    timeZone: "America/Chicago",
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                }),
                media: { mapUrl: URLS.MAP }
            };

            await db.ref('fs22_live').set(payload);
            console.log(`Sync Successful: ${liveFleet.length} units and ${factories.length} factories synced at ${payload.lastUpdated}.`);
            process.exit(0);
        } catch (error) {
            console.error("Telemetry pipeline failed:", error.message);
            process.exit(1);
        }
    }

    runFarmAudit();
})();
