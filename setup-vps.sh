#!/bin/bash
# Claw Customer Service - Ubuntu VPS Setup Script
# Run this on a fresh Ubuntu 22.04+ server as root

set -e

echo "=========================================="
echo "🦁 Claw Customer Service - VPS Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ This script must be run as root"
  echo "   Try: sudo bash setup-vps.sh"
  exit 1
fi

# Detect OS
if [ ! -f /etc/os-release ]; then
  echo "❌ Cannot detect OS. This script requires Ubuntu 22.04 or later."
  exit 1
fi

. /etc/os-release

if [ "$ID" != "ubuntu" ] || [ $(echo "$VERSION_ID" | cut -d. -f1) -lt 22 ]; then
  echo "❌ This script requires Ubuntu 22.04 or later"
  echo "   Detected: $ID $VERSION_ID"
  exit 1
fi

echo "✅ Ubuntu $VERSION_ID detected"
echo ""

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install dependencies
echo "📦 Installing dependencies..."
apt-get install -y \
  curl \
  wget \
  git \
  sqlite3 \
  build-essential \
  python3 \
  nodejs \
  npm

# Verify Node.js
echo "✅ Node.js $(node --version)"
echo "✅ npm $(npm --version)"
echo ""

# Create app directory
echo "📁 Setting up application directory..."
APP_DIR="/opt/claw-customer-service"
mkdir -p $APP_DIR
cd $APP_DIR

# Clone repository (or you can copy files manually)
echo "📥 Cloning/copying application files..."
if [ ! -d ".git" ]; then
  # If not already a git repo, we'll assume files are in place
  echo "   (Assuming application files are already in place)"
fi

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Build TypeScript
echo "🔨 Building application..."
npm run build

# Create systemd service
echo "🔧 Creating systemd service..."
cat > /etc/systemd/system/claw-customer-service.service << 'EOF'
[Unit]
Description=Claw Customer Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/claw-customer-service
EnvironmentFile=/opt/claw-customer-service/.env
ExecStart=/usr/bin/node /opt/claw-customer-service/dist/app.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

chmod 644 /etc/systemd/system/claw-customer-service.service

# Create data directory
echo "📁 Creating data directory..."
mkdir -p /opt/claw-customer-service/data
chown www-data:www-data /opt/claw-customer-service/data
chmod 750 /opt/claw-customer-service/data

# Setup firewall (ufw)
echo "🔒 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
echo "y" | ufw enable

# Setup Nginx reverse proxy (optional)
echo ""
read -p "Do you want to setup Nginx as a reverse proxy? (y/n): " SETUP_NGINX

if [ "$SETUP_NGINX" = "y" ] || [ "$SETUP_NGINX" = "Y" ]; then
  echo "📦 Installing Nginx..."
  apt-get install -y nginx
  
  cat > /etc/nginx/sites-available/claw << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

  ln -sf /etc/nginx/sites-available/claw /etc/nginx/sites-enabled/claw
  rm -f /etc/nginx/sites-enabled/default
  
  nginx -t
  systemctl restart nginx
  
  echo "✅ Nginx configured"
fi

# Setup SSL with Let's Encrypt (optional)
echo ""
read -p "Do you want to setup SSL with Let's Encrypt? (y/n): " SETUP_SSL

if [ "$SETUP_SSL" = "y" ] || [ "$SETUP_SSL" = "Y" ]; then
  apt-get install -y certbot python3-certbot-nginx
  
  read -p "Enter your domain name: " DOMAIN
  certbot certonly --nginx -d $DOMAIN
  
  echo "✅ SSL certificate installed"
  echo "   Update /etc/nginx/sites-available/claw to use SSL"
fi

# Reload systemd
systemctl daemon-reload

# Display configuration instructions
echo ""
echo "=========================================="
echo "✅ VPS Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Edit the configuration file:"
echo "   nano /opt/claw-customer-service/.env"
echo ""
echo "2. Start the service:"
echo "   systemctl start claw-customer-service"
echo ""
echo "3. Enable auto-start:"
echo "   systemctl enable claw-customer-service"
echo ""
echo "4. Check service status:"
echo "   systemctl status claw-customer-service"
echo ""
echo "5. View logs:"
echo "   journalctl -u claw-customer-service -f"
echo ""
echo "Service will be available at:"
echo "   http://localhost:3000"
echo "   (or http://$HOSTNAME if Nginx is configured)"
echo ""
