/**
 * FS22 G-Portal to Firebase Realtime Database Bridge
 * Save as: fs22/sync.js
 * Author: Werewolf3788
 * Version: 4.9 (Verification Logic + Slurry & Pallet Fix)
 */
(function() {
    const admin = require('firebase-admin');
    const axios = require('axios');
    const xml2js = require('xml2js');

    // VERIFICATION STEP: Ensure the secret is present
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.error("❌ CONNECTION ERROR: FIREBASE_SERVICE_ACCOUNT secret is missing in GitHub.");
        process.exit(1);
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        console.error("❌ FORMAT ERROR: FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
        process.exit(1);
    }

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
        console.log("🛰️ Initiating Uplink... Version 4.9");
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
            const flData = await parse(farmLR);
            const fData = await parse(fieldsR);
            const farms = await parse(farmsR);
            const career = await parse(careerR);
            const items = await parse(itemsR);
            const environment = await parse(envR);

            const attachmentMap = {};
            vData?.vehicles?.attachments?.forEach(a => {
                attachmentMap[getAttr(a, 'attachmentId')] = getAttr(a, 'rootVehicleId');
            });

            const fleet = (vData?.vehicles?.vehicle || []).map(v => {
                const id = getAttr(v, 'id');
                const fillUnits = getChild(v, 'fillUnit')?.unit || [];
                return {
                    id: id,
                    name: getAttr(v, 'name') || getAttr(v, 'category') || "Equipment",
                    farmId: getAttr(v, 'farmId') || "0",
                    x: parseFloat(getAttr(v, 'x')) || 0,
                    z: parseFloat(getAttr(v, 'z')) || 0,
                    fuel: Math.round(parseFloat(getAttr(fillUnits.find(u => getAttr(u, 'fillType') === "DIESEL"), 'fillLevel') || 0)),
                    damage: Math.round(parseFloat(getAttr(getChild(v, 'wearable'), 'damage') || 0) * 100),
                    dirt: Math.round(parseFloat(getAttr(getChild(v, 'washable')?.dirtNode?.[0], 'amount') || 0) * 100),
                    cargo: fillUnits.map(u => ({ type: getAttr(u, 'fillType'), amount: Math.round(parseFloat(getAttr(u, 'fillLevel'))) })).filter(c => c.amount > 0),
                    attachedTo: attachmentMap[id] || null
                };
            });

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
                        storage: pp?.storage?.[0]?.node?.map(n => ({ type: n.$.fillType, amount: Math.round(parseFloat(n.$.fillLevel)) })),
                        active: getAttr(pp, 'isEnabled') === 'true'
                    });
                }
            });

            const landMap = {};
            (flData?.farmlands?.farmland || []).forEach(l => { landMap[getAttr(l, 'id')] = getAttr(l, 'farmId'); });

            const fieldIntel = (fData?.fields?.field || []).map(f => {
                const id = getAttr(f, 'id');
                const cf = career?.careerSavegame?.fields?.[0]?.field?.find(x => getAttr(x, 'id') === id);
                return {
                    id: id,
                    farmId: landMap[id] || "0",
                    fruit: getAttr(f, 'plannedFruit') || "Bare",
                    fert: Math.round(parseFloat(getAttr(cf, 'fertilizerLevel') || 0)),
                    lime: getAttr(cf, 'limeLevel') || "0",
                    growth: parseInt(getAttr(cf, 'growthState')) || 1
                };
            });

            const envRoot = environment?.environment;
            const rawDayTime = parseFloat(getChild(envRoot, 'dayTime') || 0);
            const hours = Math.floor(rawDayTime) % 24;
            const minutes = Math.floor((rawDayTime - Math.floor(rawDayTime)) * 60);

            const payload = {
                server: {
                    name: getAttr(stats?.dedicatedServer, 'name') || "618 crew",
                    map: getAttr(stats?.dedicatedServer, 'mapName') || "Zielonka",
                    online: stats?.dedicatedServer?.Slots?.[0]?.$.numUsed || 0,
                    players: (stats?.dedicatedServer?.Slots?.[0]?.Player || []).map(p => ({ 
                        name: p._, 
                        isAdmin: p.$.isAdmin === 'true',
                        x: parseFloat(p.$.x) || 0, 
                        z: parseFloat(p.$.z) || 0 
                    })),
                    gameTime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
                    weather: getAttr(envRoot?.weather?.[0]?.forecast?.[0]?.instance?.[0], 'typeName') || "CLEAR",
                    mods: (stats?.dedicatedServer?.Mods?.[0]?.Mod || []).map(m => m._).slice(0, 100)
                },
                farms: (farms?.farms?.farm || []).map(f => ({ id: getAttr(f, 'farmId'), name: getAttr(f, 'name'), money: getAttr(f, 'money') })),
                fleet: fleet,
                productions: productions,
                animals: animalSummary,
                fields: fieldIntel,
                pallets: (items?.items?.item || []).filter(i => getAttr(i, 'className') === 'Pallet').length,
                lastUpdated: new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
            };

            // FINAL PUSH VERIFICATION
            await db.ref('fs22_live').set(payload);
            console.log("✅ DATA PUSHED SUCCESSFULLY to Firebase Realtime Database.");
            console.log("📍 Timestamp (Chicago): " + payload.lastUpdated);
            process.exit(0);
        } catch (e) {
            console.error("❌ CRITICAL SYNC FAILURE:", e.message);
            process.exit(1);
        }
    }
    runFarmAudit();
})();
