# OCI Deployment - Quick Start (10 Steps)

## ⚡ Fast Track Deployment (30 minutes)

### Step 1: Create OCI Compute Instance
```
1. OCI Console → Compute → Instances → Create Instance
2. Name: kinto-prod-server
3. Image: Oracle Linux 9 (Always Free)
4. Shape: VM.Standard.E4.Flex (2 OCPU, 12GB RAM - Always Free)
5. Create New VCN: kinto-prod-vcn
6. Assign Public IP: ✓
7. Generate SSH Key Pair & save to Mac
8. Click "Create"
9. Wait 1-2 minutes for "Running" status
10. Copy Public IP Address
```

### Step 2: Update Security Rules
```
1. OCI Console → Networking → Virtual Cloud Networks → kinto-prod-vcn
2. Security Lists → Create Security List: kinto-prod-sg
3. Add Ingress Rules:
   - SSH (22) from 0.0.0.0/0
   - HTTP (80) from 0.0.0.0/0
   - HTTPS (443) from 0.0.0.0/0
4. Create
5. Edit kinto-prod-subnet
6. Replace security list with kinto-prod-sg
7. Save
```

### Step 3: SSH to Instance
```bash
# From Mac terminal
chmod 600 ~/Downloads/kinto-instance.key
ssh -i ~/Downloads/kinto-instance.key opc@YOUR_PUBLIC_IP

# Create kinto user
sudo useradd -m -s /bin/bash kinto
sudo usermod -aG wheel kinto
sudo su - kinto
```

### Step 4: System Setup
```bash
sudo dnf update -y
sudo dnf install -y curl git
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm
sudo dnf install -y postgresql15-server postgresql15-contrib nginx
sudo /usr/pgsql-15/bin/postgresql-15-setup initdb
sudo systemctl enable postgresql-15 && sudo systemctl start postgresql-15
```

### Step 5: Database Setup
```bash
sudo su - postgres
psql
CREATE DATABASE kinto_ops;
CREATE USER kinto_user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE kinto_ops TO kinto_user;
\c kinto_ops
GRANT ALL ON SCHEMA public TO kinto_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kinto_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kinto_user;
\q
exit
exit  # Back to kinto user
```

### Step 6: Deploy Application
```bash
cd /home/kinto
git clone https://github.com/your-org/kinto-smart-ops.git
cd kinto-smart-ops
npm install
npm run db:push
```

### Step 7: Configure Environment
```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://kinto_user:your_password_here@localhost:5432/kinto_ops
SESSION_SECRET=$(openssl rand -base64 32)
WHATSAPP_PHONE_NUMBER_ID=your_id
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_VERIFY_TOKEN=your_token
COLLOKI_FLOW_API_KEY=sk-your-key
REPLIT_DEPLOYMENT=false
VITE_API_URL=https://yourdomain.com
EOF
chmod 600 .env
```

### Step 8: SSL Certificate
```bash
# Point your domain to the Public IP first
# Then:
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot certonly --standalone -d yourdomain.com
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer
```

### Step 9: Nginx + Systemd
```bash
# Create Nginx config (see main guide)
sudo tee /etc/nginx/conf.d/kinto.conf > /dev/null << 'NGINXEOF'
upstream kinto_app {
    server 127.0.0.1:5000;
}
server {
    listen 80;
    return 301 https://$server_name$request_uri;
}
server {
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    location / {
        proxy_pass http://kinto_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXEOF

sudo nginx -t
sudo systemctl enable nginx
sudo systemctl start nginx

# Create systemd service
sudo tee /etc/systemd/system/kinto.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=KINTO Smart Ops
After=network.target postgresql-15.service
[Service]
Type=simple
User=kinto
WorkingDirectory=/home/kinto/kinto-smart-ops
EnvironmentFile=/home/kinto/kinto-smart-ops/.env
ExecStart=/usr/bin/npm run prod
Restart=on-failure
RestartSec=10s
[Install]
WantedBy=multi-user.target
SERVICEEOF

sudo systemctl daemon-reload
sudo systemctl enable kinto
sudo systemctl start kinto
sudo systemctl status kinto
```

### Step 10: Configure WhatsApp Webhooks
```
1. Go to Meta App Dashboard → WhatsApp → Configuration
2. Callback URL: https://yourdomain.com/api/whatsapp/webhook
3. Verify Token: (from .env WHATSAPP_VERIFY_TOKEN)
4. Subscribe to: messages
5. Contact Colloki for webhook: https://yourdomain.com/api/colloki/callback
```

---

## ✅ Verify Deployment

```bash
# Check services
sudo systemctl status nginx
sudo systemctl status kinto
sudo systemctl status postgresql-15

# View logs
sudo journalctl -u kinto -f

# Test endpoint
curl https://yourdomain.com

# Should return your app!
```

---

## Backup Database

```bash
sudo su - postgres
pg_dump -Fc kinto_ops > /tmp/kinto_ops_backup.dump
exit

# Download to Mac
scp -i ~/Downloads/kinto-instance.key \
  opc@YOUR_PUBLIC_IP:/tmp/kinto_ops_backup.dump \
  ~/kinto-backups/
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| SSH connection refused | Check Security List rules, Public IP correct, firewall enabled |
| App won't start | `sudo journalctl -u kinto -n 50` to see errors |
| Database connection error | Check PostgreSQL running: `sudo systemctl status postgresql-15` |
| Nginx 502 error | App not responding on port 5000, check: `sudo ss -tlnp \| grep 5000` |
| SSL certificate error | Ensure domain points to Public IP, certbot output, DNS propagation time |

---

**Total Cost:** $0/month (Always Free Tier eligible)  
**Time to Deploy:** ~30 minutes  
**Support:** See OCI_DEPLOYMENT_GUIDE.md for detailed troubleshooting
