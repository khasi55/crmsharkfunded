
# AWS EC2 Deployment Guide

This guide explains how to deploy the CRM Shark Funded application and the MT5 Sync Worker on an AWS EC2 instance.

## Prerequisites

1.  **AWS Account**
2.  **EC2 Instance**: Ubuntu 22.04 LTS (t3.small or larger recommended)
3.  **Domain Name** (optional but recommended)

## 1. Server Setup

SSH into your EC2 instance and install dependencies:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (Process Manager) globally
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

## 2. Deploy Application

Clone your repository and setup the environment:

```bash
# Clone repo (replace with your repo URL)
git clone https://github.com/your-org/crmsharkfunded.git
cd crmsharkfunded

# Install dependencies
npm install
npm install dotenv

# Setup Environment Variables
# Copy local env or create new one
cp .env.local.example .env.local
nano .env.local
# PASTE your production values (Supabase, MT5_API_URL, etc.)
```

## 3. Build & Start Next.js App

```bash
# Build the application
npm run build

# Start Next.js with PM2
pm2 start npm --name "nextjs-app" -- start
```

## 4. Start MT5 Sync Worker

This worker handles the 15-second polling loop for active trades.

```bash
# Start the worker using the ecosystem config
pm2 start ecosystem.config.js
```

## 5. Persistence

Ensure apps restart on server reboot:

```bash
# Generate startup script
pm2 startup

# Freeze current process list
pm2 save
```

## 6. Nginx Reverse Proxy (Recommended)

Expose your app on port 80/443 instead of 3000.

```bash
sudo apt install -y nginx
```

Edit config: `sudo nano /etc/nginx/sites-available/default`

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Restart Nginx: `sudo systemctl restart nginx`

## Verification

Check status of your processes:
```bash
pm2 status
pm2 logs mt5-sync-worker
```
