/**
 * FS22 G-Portal to Firebase Realtime Database Bridge
 * Save as: fs22/sync.js
 * Author: Werewolf3788
 * Version: 4.2 (Full Stats + Missions + Farmland Ownership + Chicago Sync)
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

    // Initialize Firebase with a named instance
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
        ENV: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=environment`,
        MISSIONS: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=missions`,
        FARMS: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=farms`,
        FIELDS: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=fields`,
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
        console.log("Commencing Telemetry Audit v4.2: Maximum Intel for '618 crew'...");

        try {
            const fetch = async (url) => axios.get(url).then(r => r.data).catch(() => null);
            
            const [
                statsRaw, careerRaw, vehicleRaw, placeRaw, farmlandRaw, 
                collectRaw, foliageRaw, economyRaw, envRaw, missionRaw, 
                farmsRaw, fieldsRaw
            ] = await Promise.all([
                fetch(URLS.STATS), fetch(URLS.CAREER), fetch(URLS.VEHICLES), fetch(URLS.PLACEABLES), 
                fetch(URLS.FARMLAND), fetch(URLS.COLLECTIBLES), fetch(URLS.FOLIAGE), fetch(URLS.ECONOMY), 
                fetch(URLS.ENV), fetch(URLS.MISSIONS), fetch(URLS.FARMS), fetch(URLS.FIELDS)
            ]);

            const parse = async (raw) => raw ? xml2js.parseStringPromise(raw).catch(() => ({})) : {};
            
            const stats = await parse(statsRaw);
            const career = await parse(careerRaw);
            const vehicles = await parse(vehicleRaw);
            const placeables = await parse(placeRaw);
            const farmland = await parse(farmlandRaw);
            const collectiblesData = await parse(collectRaw);
            const foliageData = await parse(foliageRaw);
            const economyData = await parse(economyRaw);
            const environmentData = await parse(envRaw);
            const missionData = await parse(missionRaw);
            const farmsData = await parse(farmsRaw);
            const fieldsData = await parse(fieldsRaw);

            const serverInfo = stats?.Server || stats?.dedicatedServer;
            const mapSize = parseInt(getAttr(serverInfo, 'mapSize') || 2048);

            // 1. MISSIONS & REWARDS
            const activeMissions = [];
            const mList = missionData?.missions?.mission || [];
            mList.forEach(m => {
                activeMissions.push({
                    type: getAttr(m, 'type'),
                    reward: parseInt(getAttr(m, 'reward') || 0),
                    status: getAttr(m, 'status'),
                    fieldId: getAttr(getChild(m, 'field'), 'id'),
                    fruit: getAttr(getChild(m, 'field'), 'fruitTypeName')
                });
            });

            // 2. DETAILED FARM STATS
            const deepFarms = [];
            const fList = farmsData?.farms?.farm || [];
            fList.forEach(f => {
                const s = getChild(f, 'statistics');
                deepFarms.push({
                    id: getAttr(f, 'farmId'),
                    name: getAttr(f, 'name'),
                    money: parseFloat(getAttr(f, 'money') || 0),
                    loan: parseFloat(getAttr(f, 'loan') || 0),
                    playTime: (parseFloat(getChild(s, 'playTime') || 0) / 60).toFixed(1), // Hours
                    distance: parseFloat(getChild(s, 'traveledDistance') || 0).toFixed(2),
                    baleCount: parseInt(getChild(s, 'baleCount') || 0)
                });
            });

            // 3. FIELD PLANNING
            const plannedFields = [];
            const fieldItems = fieldsData?.fields?.field || [];
            fieldItems.forEach(fi => {
                plannedFields.push({
                    id: getAttr(fi, 'id'),
                    plannedFruit: getAttr(fi, 'plannedFruit')
                });
            });

            // 4. ENVIRONMENT & WEATHER
            const envRoot = environmentData?.environment;
            const dayTimeDecimal = parseFloat(getChild(envRoot, 'dayTime') || 0);
            const hours = Math.floor(dayTimeDecimal);
            const minutes = Math.floor((dayTimeDecimal - hours) * 60);
            const gameClock = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            const forecastInstances = envRoot?.weather?.[0]?.forecast?.[0]?.instance || [];
            const currentCondition = getAttr(forecastInstances[0], 'typeName') || "CLEAR";

            // 5. FLEET DATA
            const vRoot = getChild(vehicles, 'vehicles') || getChild(serverInfo, 'Vehicles');
            const vList = vRoot?.vehicle || vRoot?.Vehicle || [];
            const liveFleet = vList.map(v => {
                const rawName = getAttr(v, 'name');
                const rawCat = getAttr(v, 'category');
                let cleanName = rawName || rawCat || "Equipment";
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
                    type: (rawName || "").toLowerCase().includes('wagon') ? 'world' : 'owned'
                };
            });

            // 6. ECONOMY
            const marketPrices = [];
            const econFillTypes = economyData?.economy?.fillTypes?.[0]?.fillType || [];
            econFillTypes.forEach(ft => {
                const name = getAttr(ft, 'fillType');
                const history = ft.history?.[0]?.period || [];
                const latestPrice = history.length > 0 ? parseInt(history[history.length - 1]?._ || history[history.length - 1] || 0) : 0;
                if (name && name !== "UNKNOWN") marketPrices.push({ name, price: latestPrice });
            });

            const payload = {
                server: {
                    name: getAttr(serverInfo, 'name') || "618 crew",
                    map: getAttr(serverInfo, 'mapName') || "Elmcreek",
                    online: (getChild(serverInfo, 'Slots') || getChild(serverInfo, 'players'))?.Player?.length || 0,
                    players: (getChild(serverInfo, 'Slots')?.Player || []).map(p => ({
                        name: getAttr(p, 'name'),
                        isAdmin: getAttr(p, 'isAdmin') === 'true'
                    })),
                    gameTime: gameClock,
                    weather: currentCondition,
                    mapSize: mapSize
                },
                farms: deepFarms,
                missions: activeMissions,
                fieldPlanning: plannedFields,
                economy: marketPrices,
                fleet: { total: liveFleet.length, vehicles: liveFleet },
                collectibles: {
                    found: (collectiblesData?.collectibles?.collectible || []).filter(c => getAttr(c, 'collected') === 'true').length,
                    total: (collectiblesData?.collectibles?.collectible || []).length || 100
                },
                lastUpdated: new Date().toLocaleString("en-US", { 
                    timeZone: "America/Chicago",
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                }),
                media: { mapUrl: URLS.MAP }
            };

            await db.ref('fs22_live').set(payload);
            console.log(`Sync Successful v4.2. Farmland, Missions, and deep statistics updated for '618 crew'.`);
            process.exit(0);
        } catch (error) {
            console.error("Critical Failure:", error.message);
            process.exit(1);
        }
    }

    runFarmAudit();
})();
