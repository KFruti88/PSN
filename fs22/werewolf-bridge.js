const ftp = require("basic-ftp");
const xml2js = require("xml2js");
const admin = require("firebase-admin");
const fs = require('fs');

// 1. FIREBASE INITIALIZATION (Named Instance: 'WerewolfSync')
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://psn-fs22-overlay-default-rtdb.firebaseio.com"
    }, 'WerewolfSync');
}
const db = admin.app('WerewolfSync').database();

// 2. G-PORTAL FTP CONFIG
const ftpConfig = {
    host: "154.12.236.77",
    user: "gpftp12756933517461430",
    password: "1OtBmFfP",
    port: 50591,
    secure: false
};

async function startUplink() {
    const client = new ftp.Client();
    try {
        await client.access(ftpConfig);
        console.log("🛰️ 618 CREW UPLINK ESTABLISHED");

        // Files to capture for full intelligence
        const manifest = [
            { remote: "/savegame1/careerSavegame.xml", local: "career.xml" },
            { remote: "/savegame1/vehicles.xml", local: "vehicles.xml" },
            { remote: "/savegame1/farms.xml", local: "farms.xml" }
        ];

        for (const file of manifest) {
            await client.downloadTo(file.local, file.remote);
        }

        // --- PARSING ENGINE ---
        const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
        
        // Parse Vehicles (Fleet & Locations)
        const vehData = fs.readFileSync('vehicles.xml', 'utf-8');
        const vehResult = await parser.parseStringPromise(vehData);
        const allVehicles = Array.isArray(vehResult.vehicles.vehicle) ? vehResult.vehicles.vehicle : [vehResult.vehicles.vehicle];

        // Filter and Map Fleet
        const fleet = allVehicles.map(v => ({
            id: v.id,
            name: v.filename.split('/').pop().replace('.xml', ''),
            farmId: v.farmId,
            damage: Math.round((v.wearable?.damage || 0) * 100),
            fuel: v.fillUnit?.unit ? (Array.isArray(v.fillUnit.unit) ? Math.round(v.fillUnit.unit[1]?.fillLevel || 0) : Math.round(v.fillUnit.unit.fillLevel || 0)) : 100,
            x: parseFloat(v.component[0]?.position.split(' ')[0] || 0),
            z: parseFloat(v.component[0]?.position.split(' ')[2] || 0),
            isTrain: v.filename.includes('train')
        }));

        // Parse Farms (Money & Field Ownership)
        const farmData = fs.readFileSync('farms.xml', 'utf-8');
        const farmResult = await parser.parseStringPromise(farmData);
        const farms = Array.isArray(farmResult.farms.farm) ? farmResult.farms.farm : [farmResult.farms.farm];

        const financialIntel = farms.map(f => ({
            farmId: f.farmId,
            name: f.name,
            money: Math.floor(parseFloat(f.money)),
            loan: Math.floor(parseFloat(f.loan))
        }));

        // --- PUSH TO FIREBASE ---
        await db.ref('fs22_live').update({
            lastUpdate: new Date().toISOString(),
            fleet: fleet,
            farms: financialIntel,
            server: { name: "618 Crew", map: "Elmcreek", mapSize: 2048 }
        });

        console.log(`✅ SYNC COMPLETE: ${fleet.length} Units | ${farms.length} Farms`);

    } catch (err) {
        console.error("❌ UPLINK INTERRUPTED:", err);
    } finally {
        client.close();
    }
}

// Execute every 60 seconds (Matches G-Portal Auto-save cycle)
console.log("🔥 618 SYNC SERVICE STARTING...");
setInterval(startUplink, 60000);
startUplink();
