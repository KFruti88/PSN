/**
 * FS22 G-Portal to Firebase Realtime Database Bridge
 * Save as: fs22/sync.js
 * Author: Werewolf3788
 * Version: 4.5 (Attachments + Field Intel + Silo Inventory + Chicago Sync)
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
        VEHICLES: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=vehicles`,
        PLACEABLES: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=placeables`,
        FARMLAND: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=farmland`,
        ECONOMY: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=economy`,
        ENV: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=environment`,
        MISSIONS: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=missions`,
        FARMS: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=farms`,
        FIELDS: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=fields`,
        CAREER: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=careerSavegame`,
        MAP: `${BASE_URL}dedicated-server-stats-map.jpg?code=${CODE}&quality=60&size=512`
    };

    const getChild = (obj, key) => { const val = obj?.[key]; return Array.isArray(val) ? val[0] : val; };
    const getAttr = (obj, attr) => {
        if (!obj) return null;
        if (obj.$ && obj.$[attr] !== undefined) return obj.$[attr];
        if (obj[attr] !== undefined) return obj[attr];
        return null;
    };

    async function runFarmAudit() {
        console.log("Commencing Deep-Cycle Telemetry v4.5...");
        try {
            const fetch = async (url) => axios.get(url).then(r => r.data).catch(() => null);
            const [statsR, vehicleR, placeR, farmLR, econR, envR, missR, farmsR, fieldsR, careerR] = await Promise.all([
                fetch(URLS.STATS), fetch(URLS.VEHICLES), fetch(URLS.PLACEABLES), fetch(URLS.FARMLAND), 
                fetch(URLS.ECONOMY), fetch(URLS.ENV), fetch(URLS.MISSIONS), fetch(URLS.FARMS), 
                fetch(URLS.FIELDS), fetch(URLS.CAREER)
            ]);

            const parse = async (raw) => raw ? xml2js.parseStringPromise(raw).catch(() => ({})) : {};
            const stats = await parse(statsR);
            const vData = await parse(vehicleR);
            const pData = await parse(placeR);
            const fData = await parse(fieldsR);
            const farms = await parse(farmsR);
            const career = await parse(careerR);

            // 1. VEHICLE ATTACHMENT MAPPING
            const vList = vData?.vehicles?.vehicle || [];
            const attachmentMap = {};
            vData?.vehicles?.attachments?.forEach(a => {
                const root = getAttr(a, 'rootVehicleId');
                const sub = getAttr(a, 'attachmentId');
                if (root && sub) attachmentMap[sub] = root;
            });

            const fleet = vList.map(v => {
                const id = getAttr(v, 'id');
                const dirtNode = getChild(v, 'washable')?.dirtNode?.[0];
                return {
                    id: id,
                    name: getAttr(v, 'name') || getAttr(v, 'category') || "Equipment",
                    farmId: getAttr(v, 'farmId'),
                    x: parseFloat(getAttr(v, 'x')),
                    z: parseFloat(getAttr(v, 'z')),
                    fuel: Math.round(parseFloat(getAttr(getChild(v, 'fillUnit')?.unit?.find(u => getAttr(u, 'fillType') === "DIESEL"), 'fillLevel') || 0)),
                    damage: Math.round(parseFloat(getAttr(getChild(v, 'wearable'), 'damage') || 0) * 100),
                    dirt: Math.round(parseFloat(getAttr(dirtNode, 'amount') || 0) * 100),
                    cargo: getChild(v, 'fillUnit')?.unit?.map(u => ({ type: getAttr(u, 'fillType'), amount: Math.round(parseFloat(getAttr(u, 'fillLevel'))) })).filter(c => c.amount > 0),
                    attachedTo: attachmentMap[id] || null
                };
            });

            // 2. PRODUCTION & SHED (SILO) INVENTORY
            const productions = [];
            const silos = [];
            pData?.placeables?.placeable?.forEach(p => {
                const type = getAttr(p, 'type') || "";
                const pos = (getAttr(p, 'position') || "0 0 0").split(' ');
                
                if (type.includes('productionPoint')) {
                    productions.push({
                        name: getAttr(p, 'mapBoundId') || "Factory",
                        farmId: getAttr(p, 'farmId'),
                        x: parseFloat(pos[0]), z: parseFloat(pos[2]),
                        status: getAttr(getChild(p, 'productionPoint'), 'isEnabled'),
                        storage: getChild(p, 'productionPoint')?.storage?.[0]?.node?.map(n => ({ type: n.$.fillType, amount: Math.round(parseFloat(n.$.fillLevel)) }))
                    });
                }
                if (type.includes('silo')) {
                    silos.push({
                        name: "Shed/Silo Storage",
                        farmId: getAttr(p, 'farmId'),
                        inventory: getChild(p, 'silo')?.storage?.map(s => ({ farm: getAttr(s, 'farmId'), items: "Detailed in Save" }))
                    });
                }
            });

            // 3. FIELD INTEL (Combine Fields XML with Career Data)
            const fieldIntel = (fData?.fields?.field || []).map(f => {
                const id = getAttr(f, 'id');
                const careerField = career?.careerSavegame?.fields?.[0]?.field?.find(cf => getAttr(cf, 'id') === id);
                return {
                    id: id,
                    planned: getAttr(f, 'plannedFruit'),
                    growth: getAttr(careerField, 'growthState') || "1",
                    fert: getAttr(careerField, 'fertilizerLevel') || "0",
                    lime: getAttr(careerField, 'limeLevel') || "0",
                    isGrowing: parseInt(getAttr(careerField, 'growthState')) < 5
                };
            });

            // 4. MOD LIST
            const mods = (stats?.dedicatedServer?.Mods?.[0]?.Mod || []).map(m => ({ name: getAttr(m, 'author') + " " + m._, version: getAttr(m, 'version') }));

            const payload = {
                server: {
                    map: getAttr(stats?.dedicatedServer || stats?.Server, 'mapName') || "Zielonka",
                    online: stats?.dedicatedServer?.Slots?.[0]?.$.numUsed || 0,
                    players: (stats?.dedicatedServer?.Slots?.[0]?.Player || []).map(p => ({ name: p._, isAdmin: p.$.isAdmin === 'true', x: p.$.x, z: p.$.z })),
                    mods: mods.slice(0, 50) // Cap to avoid Firebase bloat
                },
                farms: (farms?.farms?.farm || []).map(f => ({ id: getAttr(f, 'farmId'), name: getAttr(f, 'name'), money: getAttr(f, 'money') })),
                fleet: fleet,
                productions: productions,
                fields: fieldIntel,
                lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };

            await db.ref('fs22_live').set(payload);
            console.log(`Sync v4.5 Success. Mods: ${mods.length}, Fleet: ${fleet.length}`);
            process.exit(0);
        } catch (e) { console.error(e.message); process.exit(1); }
    }
    runFarmAudit();
})();
