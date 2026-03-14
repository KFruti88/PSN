const admin = require('firebase-admin');
const Parser = require('rss-parser');

(async function() {
    const parser = new Parser();

    /**
     * UPDATED INITIALIZATION LOGIC
     */
    const rawConfig = process.env.FIREBASE_CONFIG ? process.env.FIREBASE_CONFIG.trim() : null;

    if (!rawConfig) {
        console.error("CRITICAL ERROR: The secret 'FIREBASE_CONFIG' was not found. Check your GitHub Secrets naming.");
        process.exit(1);
    }

    let firebaseConfig;
    try {
        firebaseConfig = JSON.parse(rawConfig);
    } catch (e) {
        console.error("CRITICAL ERROR: FIREBASE_CONFIG is not valid JSON.");
        console.error("Error Detail:", e.message);
        // This helps you see if the paste was cut off
        console.log("Secret length received:", rawConfig.length, "characters."); 
        process.exit(1);
    }

    const app = admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
        databaseURL: `https://${firebaseConfig.project_id}.firebaseio.com`
    }, 'AnglerSquadSyncInstance');

    const db = admin.firestore(app);
    // ... (keep the rest of the file the same)
