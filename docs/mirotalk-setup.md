# MiroTalk SFU Setup Instructions

> Task: DV-011. Domain: meet.re-search.wiki. Port: 3010.

## Prerequisites

- Node.js 22+ installed on VPS (via nvm)
- PM2 installed globally
- Nginx configured with SSL for meet.re-search.wiki (DV-027 — done)
- Ports 40000-40100 open in firewall (TCP + UDP)

## Deployment

```bash
bash scripts/deploy-mirotalk.sh
```

The script will:
1. Clone MiroTalk SFU repo to `/opt/mirotalksfu` on VPS (or pull if exists)
2. Create `.env` from `.env.template` if not present
3. Install npm dependencies
4. Start the app via PM2

## Post-deploy configuration

1. Edit `/opt/mirotalksfu/.env`:
   - `HTTP_PORT=3010`
   - `HTTPS=false` (SSL handled by Nginx)
   - `SFU_ANNOUNCED_IP=89.127.198.185` (public VPS IP)
   - `API_KEY_SECRET=<random 64-char hex>` — generate with `openssl rand -hex 32`

2. Restart:
   ```bash
   pm2 restart mirotalksfu
   ```

3. Verify:
   - Open https://meet.re-search.wiki
   - Create a test room
   - Join with audio/video from two tabs

## Firewall

WebRTC media ports must be open:
```bash
sudo ufw allow 40000:40100/tcp comment 'MiroTalk media TCP'
sudo ufw allow 40000:40100/udp comment 'MiroTalk media UDP'
sudo ufw reload
```

## Nginx

Reference config: `scripts/nginx-meet.conf`.

SSL for meet.re-search.wiki was configured during DV-027 (certbot). The proxy_pass block must forward WebSocket upgrades correctly — see the reference config.

## Troubleshooting

| Problem | Check |
|---------|-------|
| 502 Bad Gateway | `pm2 status mirotalksfu` — is it running? |
| No audio/video | `sudo ufw status \| grep 40000` — ports open? |
| One-way audio | `SFU_ANNOUNCED_IP` set correctly in .env? |
| Can't connect | `curl -I http://localhost:3010` — responding locally? |
| Logs | `pm2 logs mirotalksfu --lines 100` |

## Updating

```bash
ssh -i ~/.ssh/id_ed25519 -p 28108 dv@re-search.wiki
cd /opt/mirotalksfu
git pull origin main
npm install
pm2 restart mirotalksfu
```
