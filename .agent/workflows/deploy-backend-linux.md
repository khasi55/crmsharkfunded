---
description: Deploy the Node.js backend to a Linux server
---

# Deploy Backend to Linux

Follow these steps to deploy the Risk Engine Backend to a Linux server (Ubuntu/Debian).

## 1. Prepare the Server

Ensure your server is running Ubuntu 20.04 or 22.04 LTS.

## 2. Upload Code

Upload the `backend` directory to your server. You can use `scp` or `git`.

## 3. Run the Setup Script

The `setup_linux.sh` script automates Node.js installation, dependency checks, building, and environment setup.

// turbo
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

// turbo
2. Make the script executable:
   ```bash
   chmod +x setup_linux.sh
   ```

3. Run the setup script:
   ```bash
   ./setup_linux.sh
   ```

## 4. Configuration

1. Edit the `.env` file that was created:
   ```bash
   nano .env
   ```
2. Ensure the following variables are set:
   - `MT5_BRIDGE_URL`: URL to your Windows Bridge (e.g., `http://YOUR_WINDOWS_IP:8000` or ngrok URL).
   - `SUPABASE_URL`: Your Supabase URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key.
   - `REDIS_URL`: (Optional) Redis connection string if using external Redis.

## 5. Start the Server

Start the application using PM2 to ensure it runs in the background and restarts on reboot.

// turbo
1. Start the app:
   ```bash
   pm2 start dist/server.js --name "risk-engine"
   ```

// turbo
2. Save the process list:
   ```bash
   pm2 save
   ```

// turbo
3. Generate startup script:
   ```bash
   pm2 startup
   ```

## 6. Access Logs

To view the application logs:
```bash
pm2 logs risk-engine
```

## 7. Domain Setup (api.sharkfunded.co)

To serve the API on `api.sharkfunded.co`, install Nginx and Certbot.

1.  **Install Nginx & Certbot**:
    ```bash
    sudo apt install nginx certbot python3-certbot-nginx -y
    ```

2.  **Configure Nginx**:
    Create a config file:
    ```bash
    sudo nano /etc/nginx/sites-available/api.sharkfunded.co
    ```
    Paste the following (proxying to port 3001):
    ```nginx
    server {
        server_name api.sharkfunded.co;

        location / {
            proxy_pass http://localhost:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

3.  **Enable Site**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/api.sharkfunded.co /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

4.  **SSL (HTTPS)**:
    ```bash
    sudo certbot --nginx -d api.sharkfunded.co
    ```

