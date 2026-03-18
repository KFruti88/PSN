name: FS22 Data Sync

on:
  schedule:
    - cron: '*/10 * * * *'
  workflow_dispatch:

# Fixes Node.js 20 deprecation warnings by forcing Node 24 for all actions
env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

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
        run: npm install firebase-admin axios xml2js

      - name: Run Sync Script
        # continue-on-error ensures that even if G-Portal is briefly down, 
        # the dashboard pages still attempt to build/deploy
        continue-on-error: true
        run: node fs22/sync.js
        env:
          FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload Pages Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'

  deploy:
    needs: sync
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to Pages
        id: deployment
        uses: actions/deploy-pages@v4
