# Deployment Notes

## Server Setup (EC2)

### Domain
- Domain: remotereading.duckdns.org
- Provider: DuckDNS (free subdomain)
- Points to: 3.208.245.69 (Elastic IP)

### Nginx
- Installed on EC2 as reverse proxy
- Listens on port 80 and 443
- Forwards requests to Node.js on port 3000
- Config file: /etc/nginx/conf.d/remote-reading.conf

### HTTPS
- Certificate provider: Let's Encrypt (via Certbot)
- Auto-renews every 90 days
- Certificate location: /etc/letsencrypt/live/remotereading.duckdns.org/

### PM2
- Node.js process manager
- App name: remote-reading-server
- Auto-starts on server reboot

### Environment
- Node.js: v20.20.2
- npm: 11.12.1
- PM2: 6.0.14