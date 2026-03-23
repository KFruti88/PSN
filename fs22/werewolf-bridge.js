const ftp = require("basic-ftp");
const xml2js = require("xml2js");
const admin = require("firebase-admin");

// 1. FIREBASE SETUP
// Download your serviceAccountKey.json from Firebase Console -> Project Settings -> Service Accounts
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://psn-fs22-overlay-default-rtdb.firebaseio.com"
});

const db = admin.database();

// 2. FTP CONFIG (From your uplink credentials)
const ftpConfig = {
  host: "154.12.236.77",
  user: "gpftp12756933517461430",
  password: "1OtBmFfP",
  port: 50591,
  secure: false
};

async function syncFarmData() {
  const client = new ftp.Client();
  // client.ftp.verbose = true; // Uncomment for debugging

  try {
    await client.access(ftpConfig);
    console.log("🛰️ UPLINK ESTABLISHED TO G-PORTAL FTP");

    // List of files to grab (Career stats, vehicles, and precision farming)
    const filesToSync = [
        { remote: "/savegame1/careerSavegame.xml", local: "temp_career.xml", dbPath: "fs22_live/server" },
        { remote: "/savegame1/vehicles.xml", local: "temp_vehicles.xml", dbPath: "fs22_live/fleet" },
        { remote: "/savegame1/farms.xml", local: "temp_farms.xml", dbPath: "fs22_live/farms" }
    ];

    for (const file of filesToSync) {
      // Download
      await client.downloadTo(file.local, file.remote);
      
      // Read and Parse
      const fs = require('fs');
      const xmlData = fs.readFileSync(file.local, 'utf-8');
      const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
      
      const result = await parser.parseStringPromise(xmlData);
      
      // Clean up the data for Firebase (Removing large unnecessary nodes)
      // This is where you filter the specific data you want
      await db.ref(file.dbPath).set(result);
      console.log(`✅ SYNCED: ${file.remote} -> Firebase ${file.dbPath}`);
    }

  } catch (err) {
    console.log("❌ UPLINK ERROR:", err);
  } finally {
    client.close();
  }
}

// Run the sync every 60 seconds
console.log("🔥 WEREWOLF BRIDGE ACTIVE");
setInterval(syncFarmData, 60000); 
syncFarmData(); // Initial run
