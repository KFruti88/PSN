/**
 * FS22 G-Portal to Firebase Realtime Database Bridge
 * Save as: fs22/sync.js
 * Author: Werewolf3788
 * Version: 3.8 (Absolute Maximum Telemetry + Economy + Chicago Sync)
 */
(function() {
    const admin = require('firebase-admin');
    const axios = require('axios');
    const xml2js = require('xml2js');

    // Security check for GitHub Secrets
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.error("Critical: FIREBASE_SERVICE_ACCOUNT secret is missing.");
        process.exit(1);
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    // Initialize Firebase with a named instance to avoid conflicts
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://psn-fs22-overlay-default-rtdb.firebaseio.com"
        }, 'fs22SyncInstance');
    }

    const db = admin.app('fs22SyncInstance').database();

    // Server Configuration
    const CODE = "CVzQ6vUR4l7iRtH4";
    const BASE_URL = "http://154.12.236.77:8650/feed/";

    const URLS = {
        STATS: `${BASE_URL}dedicated-server-stats.xml?code=${CODE}`,
        CAREER: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=careerSavegame`,
        VEHICLES: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=vehicles`,
        PLACEABLES: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=placeables`,
        FARMLAND: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=farmland`,
        COLLECTIBLES: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=collectibles`,
        FOLIAGE: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=foliageCropsUpdater`,
        ECONOMY: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=economy`,
        MAP: `${BASE_URL}dedicated-server-stats-map.jpg?code=${CODE}&quality=60&size=512`
    };

    // Fill Type Mapping from G-Portal tipTypeMappings
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
        console.log("Commencing v3.8 Comprehensive Telemetry Audit for '618 crew'...");

        try {
            const fetch = async (url) => axios.get(url).then(r => r.data).catch(() => null);
            
            // Parallel Fetch of all XML streams
            const [statsRaw, careerRaw, vehicleRaw, placeRaw, farmRaw, collectRaw, foliageRaw, economyRaw] = await Promise.all([
                fetch(URLS.STATS), fetch(URLS.CAREER), fetch(URLS.VEHICLES), fetch(URLS.PLACEABLES), 
                fetch(URLS.FARMLAND), fetch(URLS.COLLECTIBLES), fetch(URLS.FOLIAGE), fetch(URLS.ECONOMY)
            ]);

            const parse = async (raw) => raw ? xml2js.parseStringPromise(raw).catch(() => ({})) : {};
            
            const stats = await parse(statsRaw);
            const career = await parse(careerRaw);
            const vehicles = await parse(vehicleRaw);
            const placeables = await parse(placeRaw);
            const farmland = await parse(farmRaw);
            const collectiblesData = await parse(collectRaw);
            const foliageData = await parse(foliageRaw);
            const economyData = await parse(economyRaw);

            const serverInfo = stats?.Server || stats?.dedicatedServer;
            const mapSize = parseInt(getAttr(serverInfo, 'mapSize') || 2048);

            // 1. ECONOMY & MARKET PRICES
            const marketPrices = [];
            const fillTypes = economyData?.economy?.fillTypes?.[0]?.fillType || [];
            fillTypes.forEach(ft => {
                const name = getAttr(ft, 'fillType');
                const history = ft.history?.[0]?.period || [];
                // Grabbing the most recent price period from the XML
                const latestPrice = history.length > 0 ? parseInt(history[history.length - 1]?._ || history[history.length - 1] || 0) : 0;
                if (name && name !== "UNKNOWN") {
                    marketPrices.push({ name, price: latestPrice });
                }
            });

            // 2. ANIMALS & HUSBANDRY (Health, Hunger, Production)
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
                        health: Math.round(parseFloat(getAttr(hNode, 'health') || 0)),
                        population: parseInt(getAttr(hNode, 'numAnimals') || 0),
                        storage: storage
                    });
                }
            });

            // 3. FIELD INTELLIGENCE (Growth, Lime, Fertilizer)
            const fieldRecords = [];
            const saveFields = getChild(career, 'careerSavegame')?.fields?.[0]?.field || [];
            saveFields.forEach(f => {
                fieldRecords.push({
                    id: getAttr(f, 'id'),
                    farmId: getAttr(f, 'farmId') || "0",
                    growth: getAttr(f, 'growthState') || "1",
                    fertilizer: getAttr(f, 'fertilizerLevel') || "0",
                    lime: getAttr(f, 'limeLevel') || "0",
                    fruit: getAttr(f, 'fruitType') || "Bare"
                });
            });

            // 4. FLEET NOMENCLATURE & REPAIR STATUS
            const vRoot = getChild(vehicles, 'vehicles') || getChild(serverInfo, 'Vehicles');
            const vList = vRoot?.vehicle || vRoot?.Vehicle || [];
            const liveFleet = vList.map(v => {
                const rawName = getAttr(v, 'name');
                const rawCat = getAttr(v, 'category');
                
                // Nomenclature Fallback Logic
                let cleanName = rawName || rawCat || "Equipment";
                
                // Fill Type Translation
                let fillType = getAttr(v, 'fillTypes') || "Empty";
                if (!isNaN(fillType) && TIP_TYPES[fillType]) { fillType = TIP_TYPES[fillType]; }

                return {
                    name: cleanName,
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

            // 5. PERSONNEL & ADMIN HANDLES
            const slots = getChild(serverInfo, 'Slots') || getChild(serverInfo, 'players');
            const playerEntries = slots?.Player || slots?.player || [];
            const players = playerEntries.map(p => ({
                name: getAttr(p, 'name') || p._ || "Worker",
                isAdmin: getAttr(p, 'isAdmin') === 'true' || getAttr(p, 'isAdmin') === true
            }));

            // 6. MULTI-FARM LIQUIDITY
            const careerRoot = getChild(career, 'careerSavegame');
            const farmList = careerRoot?.farms?.[0]?.farm || [];
            const farmsData = farmList.filter(f => getAttr(f, 'farmId') !== "0").map(f => ({
                id: getAttr(f, 'farmId'),
                name: getAttr(f, 'name') || "Active Farm",
                money: parseInt(getChild(f, 'money') || 0)
            }));

            // If no distinct farms exist yet, fall back to global statistics
            if (farmsData.length === 0) {
                const statsBlock = getChild(careerRoot, 'statistics');
                const moneyVal = getChild(statsBlock, 'money') || 0;
                farmsData.push({ id: "1", name: "618 crew", money: parseInt(moneyVal) });
            }

            const payload = {
                server: {
                    name: getAttr(serverInfo, 'name') || "618 crew",
                    map: getAttr(serverInfo, 'mapName') || "Elmcreek",
                    online: players.length,
                    max: parseInt(getAttr(slots, 'capacity') || 6),
                    players: players,
                    growthCycle: getAttr(foliageData?.foliageCropsUpdater, 'currentGrowthIndex') || "0",
                    mapSize: mapSize
                },
                economy: marketPrices,
                animals: animalPens,
                fleet: { total: liveFleet.length, vehicles: liveFleet },
                fields: fieldRecords,
                collectibles: {
                    found: (collectiblesData?.collectibles?.collectible || []).filter(c => getAttr(c, 'collected') === 'true').length,
                    total: (collectiblesData?.collectibles?.collectible || []).length || 100
                },
                // Forced Central Time (Chicago)
                lastUpdated: new Date().toLocaleString("en-US", { 
                    timeZone: "America/Chicago",
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                }),
                media: { mapUrl: URLS.MAP }
            };

            // Commit Payload to Firebase
            await db.ref('fs22_live').set(payload);
            console.log(`Sync Successful v3.8. Chicago Time: ${payload.lastUpdated}.`);
            process.exit(0);
        } catch (error) {
            console.error("Critical Telemetry Failure:", error.message);
            process.exit(1);
        }
    }

    // Execute Audit
    runFarmAudit();
})();
