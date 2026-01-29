# Quick Setup Guide - Authentication Microservice

This guide will help you set up and deploy the authentication microservice for 24/7 availability on your online server.

---

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- A server with a public domain name (for OAuth callbacks)
- OAuth app credentials from Google, Facebook, and Microsoft

---

## Step 1: Install Dependencies

```bash
# Navigate to project directory
cd /path/to/auth

# Install all dependencies
npm install
```

---

## Step 2: Configure Environment Variables

1. **Create `.env` file:**

```bash
cp .env.example .env
```

2. **Edit `.env` file with your credentials:**

```bash
nano .env  # or use your preferred editor
```

3. **Fill in the following values:**

```env
# Session Secret - Generate a strong random string
SESSION_SECRET=your-super-secret-random-string-here-min-32-characters

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth Credentials
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Microsoft OAuth Credentials
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

**Generate a secure session secret:**
```bash
# On Linux/Mac
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Step 3: Configure OAuth Providers

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API** or **Google Identity API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. **Authorized redirect URIs**: Add:
   ```
   https://yourdomain.com/auth/google/callback
   ```
   (Replace `yourdomain.com` with your actual domain)
7. Copy the **Client ID** and **Client Secret** to your `.env` file

### Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Click **Create App** → Choose **Consumer** or **Business** type
3. Go to **Settings** → **Basic**
4. Add **App Domains**: `yourdomain.com`
5. Go to **Facebook Login** → **Settings**
6. **Valid OAuth Redirect URIs**: Add:
   ```
   https://yourdomain.com/auth/facebook/callback
   ```
7. Copy **App ID** and **App Secret** to your `.env` file

### Microsoft OAuth Setup

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Name your app and set **Redirect URI**:
   - Platform: **Web**
   - URI: `https://yourdomain.com/auth/microsoft/callback`
5. After creation, go to **Certificates & secrets**
6. Create a **New client secret** and copy it immediately (it won't be shown again)
7. Copy **Application (client) ID** and **Client secret** to your `.env` file

---

## Step 4: Update Server Configuration for Production

Before deploying, update `server.js` for production:

1. **Enable secure cookies** (line 17):
   ```javascript
   cookie: { secure: true } // Set to true for HTTPS
   ```

2. **Update callback URLs** if using a different domain:
   - The callback URLs in the code use relative paths, which is fine
   - Ensure your OAuth provider settings match your actual domain

---

## Step 5: Deploy for 24/7 Availability

### Option A: Using PM2 (Recommended)

PM2 is a process manager that keeps your app running and restarts it if it crashes.

1. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```

2. **Start the application:**
   ```bash
   pm2 start server.js --name auth-service
   ```

3. **Configure PM2 to start on system boot:**
   ```bash
   pm2 startup
   # Follow the instructions it provides
   pm2 save
   ```

4. **Useful PM2 commands:**
   ```bash
   pm2 status              # Check status
   pm2 logs auth-service   # View logs
   pm2 restart auth-service # Restart service
   pm2 stop auth-service   # Stop service
   pm2 monit               # Monitor resources
   ```

### Option B: Using systemd (Linux)

1. **Create service file:**
   ```bash
   sudo nano /etc/systemd/system/auth-service.service
   ```

2. **Add the following content:**
   ```ini
   [Unit]
   Description=Authentication Microservice
   After=network.target

   [Service]
   Type=simple
   User=your-username
   WorkingDirectory=/path/to/auth
   Environment="NODE_ENV=production"
   EnvironmentFile=/path/to/auth/.env
   ExecStart=/usr/bin/node /path/to/auth/server.js
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable and start the service:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable auth-service
   sudo systemctl start auth-service
   ```

4. **Check status:**
   ```bash
   sudo systemctl status auth-service
   sudo journalctl -u auth-service -f  # View logs
   ```

### Option C: Using Docker

1. **Create `Dockerfile`:**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 3030
   CMD ["node", "server.js"]
   ```

2. **Create `docker-compose.yml`:**
   ```yaml
   version: '3.8'
   services:
     auth-service:
       build: .
       ports:
         - "3030:3030"
       env_file:
         - .env
       restart: unless-stopped
   ```

3. **Run with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

---

## Step 6: Set Up Reverse Proxy (Nginx)

For production, use Nginx as a reverse proxy with SSL:

1. **Install Nginx:**
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Create Nginx configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/auth-service
   ```

3. **Add configuration:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       # Redirect HTTP to HTTPS
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name yourdomain.com;

       ssl_certificate /path/to/ssl/cert.pem;
       ssl_certificate_key /path/to/ssl/key.pem;

       location / {
           proxy_pass http://localhost:3030;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/auth-service /etc/nginx/sites-enabled/
   sudo nginx -t  # Test configuration
   sudo systemctl reload nginx
   ```

5. **Set up SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

---

## Step 7: Test the Service

1. **Check if service is running:**
   ```bash
   curl http://localhost:3030/
   ```

2. **Test endpoints:**
   - Visit `https://yourdomain.com/` in browser
   - Try logging in with each provider:
     - `https://yourdomain.com/auth/google`
     - `https://yourdomain.com/auth/facebook`
     - `https://yourdomain.com/auth/microsoft`
   - After login, check profile: `https://yourdomain.com/auth/profile`
   - Test logout: `https://yourdomain.com/auth/logout`

---

## Step 8: Monitoring and Maintenance

### Health Check Endpoint

Add this to your `server.js` for monitoring:

```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

### Set Up Logging

Consider using a logging library like `winston` or `morgan`:

```bash
npm install morgan
```

Add to `server.js`:
```javascript
const morgan = require('morgan');
app.use(morgan('combined'));
```

### Monitor Logs

```bash
# PM2
pm2 logs auth-service --lines 100

# systemd
sudo journalctl -u auth-service -f

# Docker
docker-compose logs -f
```

### Set Up Alerts

Configure monitoring tools (e.g., PM2 Plus, Datadog, New Relic) to alert you if:
- Service goes down
- High error rate
- High response time
- High memory/CPU usage

---

## Troubleshooting

### Service Won't Start

1. **Check if port 3030 is already in use:**
   ```bash
   lsof -i :3030
   # or
   netstat -tulpn | grep 3030
   ```

2. **Check environment variables:**
   ```bash
   node -e "require('dotenv').config(); console.log(process.env.GOOGLE_CLIENT_ID)"
   ```

3. **Check logs:**
   ```bash
   pm2 logs auth-service
   # or
   sudo journalctl -u auth-service -n 50
   ```

### OAuth Callbacks Not Working

1. **Verify callback URLs match exactly:**
   - Check provider console settings
   - Ensure protocol (http/https) matches
   - Ensure domain matches exactly

2. **Check Nginx/proxy configuration:**
   - Ensure `X-Forwarded-Proto` header is set
   - Verify proxy passes requests correctly

3. **Check session configuration:**
   - Ensure `SESSION_SECRET` is set
   - Verify cookies are working (check browser DevTools)

### Session Not Persisting

1. **Check cookie settings:**
   - Ensure `secure: true` for HTTPS
   - Check `SameSite` attribute if needed
   - Verify domain settings

2. **Check session storage:**
   - Default uses memory (not suitable for multiple instances)
   - Consider Redis for production with multiple instances

---

## Production Checklist

- [ ] Strong `SESSION_SECRET` generated and set
- [ ] All OAuth credentials configured correctly
- [ ] Callback URLs match in code and provider consoles
- [ ] HTTPS enabled with valid SSL certificate
- [ ] `secure: true` in cookie settings
- [ ] Process manager (PM2/systemd/Docker) configured
- [ ] Auto-restart on failure enabled
- [ ] Logging configured
- [ ] Monitoring/alerting set up
- [ ] Firewall configured (only necessary ports open)
- [ ] `.env` file secured (not in version control)
- [ ] Regular backups configured (if storing user data)

---

## Quick Reference

### Start Service
```bash
# PM2
pm2 start server.js --name auth-service

# systemd
sudo systemctl start auth-service

# Docker
docker-compose up -d
```

### Stop Service
```bash
# PM2
pm2 stop auth-service

# systemd
sudo systemctl stop auth-service

# Docker
docker-compose down
```

### Restart Service
```bash
# PM2
pm2 restart auth-service

# systemd
sudo systemctl restart auth-service

# Docker
docker-compose restart
```

### View Logs
```bash
# PM2
pm2 logs auth-service

# systemd
sudo journalctl -u auth-service -f

# Docker
docker-compose logs -f
```

### Check Status
```bash
# PM2
pm2 status

# systemd
sudo systemctl status auth-service

# Docker
docker-compose ps
```

---

## Support

For detailed code explanations, see `DOCUMENTATION.md`.

For issues:
1. Check logs first
2. Verify environment variables
3. Test OAuth provider configurations
4. Check network/firewall settings
