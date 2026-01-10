#!/bin/bash

# 🚀 AWS EC2 Deployment Script for CRM Backend (Node.js)
# Run this on your Ubuntu 24.04 / 22.04 LTS Instance

echo "📦 Starting Deployment..."

# 1. Update System
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl git unzip

# 2. Install Node.js 20.x
echo "🛠️ Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install Global Tools (PM2, TypeScript)
echo "🛠️ Installing PM2 & TypeScript..."
sudo npm install -g pm2 typescript ts-node

# 4. Setup Project (Assuming you upload code to ~/crm-backend)
# NOTE: You normally git clone here. For now, we assume folder exists or you unzip it.
APP_DIR="$HOME/crm-backend"
mkdir -p $APP_DIR

echo "📂 Navigating to $APP_DIR..."
cd $APP_DIR

# 5. Install Dependencies
if [ -f "package.json" ]; then
    echo "📦 Installing NPM Dependencies..."
    npm install
else
    echo "⚠️ No package.json found! Please clone/upload your code to $APP_DIR first."
    exit 1
fi

# 6. Build TypeScript
echo "🔨 Building Project..."
npm run build

# 7. Setup Env (Interactive)
if [ ! -f ".env" ]; then
    echo "⚠️ .env file missing!"
    echo "Creating empty .env..."
    touch .env
    echo "PORT=3001" >> .env
    echo "# Add SUPABASE_URL, SUPABASE_KEY, BRIDGE_URL here" >> .env
    echo "⚠️ Please edit .env before starting!"
fi

# 8. Start with PM2
echo "🚀 Starting Server with PM2..."
pm2 start dist/server.js --name "crm-backend"
pm2 save
pm2 startup

echo "✅ Deployment Setup Complete!"
echo "👉 Edit your .env file: nano .env"
echo "👉 Restart after edit: pm2 restart crm-backend"
