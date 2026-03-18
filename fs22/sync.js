/**
 * FS22 G-Portal to Firebase Realtime Database Bridge
 * Save as: fs22/sync.js
 * Author: Werewolf3788
 * Version: 4.6 (Extreme Telemetry + Animals + Pallets + Attachments)
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
        MISSIONS: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=missions`,
        FARMS: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=farms`,
        FIELDS: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=fields`,
        CAREER: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=careerSavegame`,
        ITEMS: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=items`,
        ENV: `${BASE_URL}dedicated-server-savegame.html?code=${CODE}&file=environment`
    };

    const getChild = (obj, key) => { const val = obj?.[key]; return Array.isArray(val) ? val[0] : val; };
    const getAttr = (obj, attr) => {
        if (!obj) return null;
        if (obj.$ && obj.$[attr] !== undefined) return obj.$[attr];
        if (obj[attr] !== undefined) return obj[attr];
        return null;
    };

    async function runFarmAudit() {
        console.log("Commencing Full-Spectrum Command Audit v4.6...");
        try {
            const fetch = async (url) => axios.get(url).then(r => r.data).catch(() => null);
            const [statsR, vehicleR, placeR, farmLR, missR, farmsR, fieldsR, careerR, itemsR, envR] = await Promise.all([
                fetch(URLS.STATS), fetch(URLS.VEHICLES), fetch(URLS.PLACEABLES), fetch(URLS.FARMLAND), 
                fetch(URLS.MISSIONS), fetch(URLS.FARMS), fetch(URLS.FIELDS), fetch(URLS.CAREER),
                fetch(URLS.ITEMS), fetch(URLS.ENV)
            ]);

            const parse = async (raw) => raw ? xml2js.parseStringPromise(raw).catch(() => ({})) : {};
            const stats = await parse(statsR);
            const vData = await parse(vehicleR);
            const pData = await parse(placeR);
            const fData = await parse(fieldsR);
            const farms = await parse(farmsR);
            const career = await parse(careerR);
            const items = await parse(itemsR);
            const environment = await parse(envR);

            // 1. ATTACHMENT MAP
            const attachmentMap = {};
            vData?.vehicles?.attachments?.forEach(a => {
                attachmentMap[getAttr(a, 'attachmentId')] = getAttr(a, 'rootVehicleId');
            });

            // 2. FLEET & CARGO
            const fleet = (vData?.vehicles?.vehicle || []).map(v => {
                const id = getAttr(v, 'id');
                const fillUnits = getChild(v, 'fillUnit')?.unit || [];
                return {
                    id: id,
                    name: getAttr(v, 'name') || getAttr(v, 'category') || "Tool",
                    farmId: getAttr(v, 'farmId'),
                    x: parseFloat(getAttr(v, 'x')), z: parseFloat(getAttr(v, 'z')),
                    fuel: Math.round(parseFloat(getAttr(fillUnits.find(u => getAttr(u, 'fillType') === "DIESEL"), 'fillLevel') || 0)),
                    damage: Math.round(parseFloat(getAttr(getChild(v, 'wearable'), 'damage') || 0) * 100),
                    dirt: Math.round(parseFloat(getAttr(getChild(v, 'washable')?.dirtNode?.[0], 'amount') || 0) * 100),
                    cargo: fillUnits.map(u => ({ type: getAttr(u, 'fillType'), amount: Math.round(parseFloat(getAttr(u, 'fillLevel'))) })).filter(c => c.amount > 0),
                    attachedTo: attachmentMap[id] || null
                };
            });

            // 3. ANIMAL & PRODUCTION INTEL
            const productions = [];
            const animalSummary = [];
            pData?.placeables?.placeable?.forEach(p => {
                const type = getAttr(p, 'type') || "";
                if (type.includes('husbandry')) {
                    const h = getChild(p, 'husbandryAnimals');
                    animalSummary.push({ farmId: getAttr(p, 'farmId'), type: type.split('.').pop(), count: parseInt(getAttr(h, 'numAnimals') || 0) });
                }
                if (type.includes('productionPoint')) {
                    const pp = getChild(p, 'productionPoint');
                    productions.push({
                        name: getAttr(p, 'mapBoundId') || "Factory",
                        farmId: getAttr(p, 'farmId'),
                        storage: pp?.storage?.[0]?.node?.map(n => ({ type: n.$.fillType, amount: Math.round(parseFloat(n.$.fillLevel)) }))
                    });
                }
            });

            // 4. FIELD & PROPERTY INTEL
            const landMap = {};
            (farmlandData?.farmlands?.farmland || []).forEach(l => { landMap[getAttr(l, 'id')] = getAttr(l, 'farmId'); });

            const fieldIntel = (fData?.fields?.field || []).map(f => {
                const id = getAttr(f, 'id');
                const cf = career?.careerSavegame?.fields?.[0]?.field?.find(x => getAttr(x, 'id') === id);
                return {
                    id: id,
                    farmId: landMap[id] || "0",
                    fruit: getAttr(f, 'plannedFruit') || "Bare",
                    fert: getAttr(cf, 'fertilizerLevel') || "0",
                    lime: getAttr(cf, 'limeLevel') || "0",
                    growth: parseInt(getAttr(cf, 'growthState')) || 1
                };
            });

            // 5. PALLET COUNT
            const pallets = (items?.items?.item || []).filter(i => getAttr(i, 'className') === 'Pallet').length;

            const payload = {
                server: {
                    name: getAttr(stats?.dedicatedServer, 'name'),
                    map: getAttr(stats?.dedicatedServer, 'mapName'),
                    online: stats?.dedicatedServer?.Slots?.[0]?.$.numUsed || 0,
                    players: (stats?.dedicatedServer?.Slots?.[0]?.Player || []).map(p => ({ name: p._, isAdmin: p.$.isAdmin === 'true', x: p.$.x, z: p.$.z })),
                    gameTime: getAttr(environment?.environment, 'dayTime'),
                    mods: (stats?.dedicatedServer?.Mods?.[0]?.Mod || []).map(m => m._)
                },
                farms: (farms?.farms?.farm || []).map(f => ({ id: getAttr(f, 'farmId'), name: getAttr(f, 'name'), money: getAttr(f, 'money') })),
                fleet: fleet,
                productions: productions,
                animals: animalSummary,
                fields: fieldIntel,
                pallets: pallets,
                lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })
            };

            await db.ref('fs22_live').set(payload);
            process.exit(0);
        } catch (e) { console.error(e); process.exit(1); }
    }
    runFarmAudit();
})();
