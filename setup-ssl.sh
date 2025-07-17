#!/bin/bash
# SSL Setup Script for Nexus Bot
# Run this when DNS bot.nexus-panel.com points to this server

echo "🔒 Setting up SSL for Nexus Bot..."

# Check if domain resolves to this server
IP=$(curl -s ipinfo.io/ip)
DOMAIN_IP=$(dig +short bot.nexus-panel.com)

if [ "$IP" != "$DOMAIN_IP" ]; then
    echo "❌ Domain bot.nexus-panel.com does not point to this server"
    echo "Current server IP: $IP"
    echo "Domain resolves to: $DOMAIN_IP"
    echo "Please update DNS first."
    exit 1
fi

echo "✅ Domain resolves correctly to $IP"

# Update nginx config for SSL
sed -i 's/server_name 31.57.96.28;/server_name bot.nexus-panel.com;/' /etc/nginx/sites-available/nexus-bot

# Test nginx config
nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration error"
    exit 1
fi

# Reload nginx
systemctl reload nginx

# Obtain SSL certificate
certbot --nginx -d bot.nexus-panel.com --non-interactive --agree-tos --email admin@nexus-panel.com

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate installed successfully"
    echo "🔗 Bot API now available at: https://bot.nexus-panel.com"
    
    # Update UFW to allow HTTPS
    ufw allow 443
    
    echo "📋 Update backend configuration:"
    echo "BOT_HTTP_URL=https://bot.nexus-panel.com"
else
    echo "❌ SSL certificate installation failed"
    exit 1
fi