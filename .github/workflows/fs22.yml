# Save this file as: .github/workflows/fs22.yml
name: FS22 Data Sync

on:
  schedule:
    - cron: '*/10 * * * *' # Runs every 10 minutes
  workflow_dispatch:      # Allows you to trigger the sync manually from the Actions tab

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'

      - name: Install Dependencies
        # Installs the libraries needed for sync.js to talk to G-Portal and Firebase
        run: npm install firebase-admin axios xml2js

      - name: Run Sync Script
        # Executes the bridge script in your fs22 folder
        run: node fs22/sync.js
        env:
          # This pulls the JSON from your GitHub Secrets
          FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
