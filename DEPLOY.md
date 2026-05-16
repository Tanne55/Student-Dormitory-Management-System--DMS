# Huong dan trien khai QLKTX

Tai lieu trien khai he thong QLKTX (NestJS backend + Next.js frontend) tu local toi production.

---

## Muc luc

1. [Yeu cau he thong](#yeu-cau-he-thong)
2. [Local development](#local-development)
3. [Staging deployment (VPS)](#staging-deployment-vps)
4. [Production checklist](#production-checklist)
5. [Backup va rollback](#backup-va-rollback)
6. [Troubleshooting thuong gap](#troubleshooting-thuong-gap)

---

## Yeu cau he thong

### Local development

- Node.js 20 LTS (kiem tra: `node -v`)
- npm 10+
- MySQL 8.0+ (hoac Docker)
- Git

### Production server

| Component | Toi thieu | Khuyen nghi |
|---|---|---|
| CPU | 2 cores | 4 cores |
| RAM | 2 GB | 4 GB |
| Disk | 20 GB SSD | 50 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Network | 1 IPv4 public | + domain HTTPS |

### Dich vu ben ngoai can chuan bi

- Domain (vd: `ktx.truonghoc.edu.vn`)
- SMTP service (Gmail App Password, SendGrid, Mailgun, ...)
- VNPay merchant account (production credentials)
- Optional: Sentry account de track loi

---

## Local development

### Setup lan dau

```bash
git clone https://github.com/Tanne55/Student-Dormitory-Management-System--DMS.git
cd Student-Dormitory-Management-System--DMS

# Backend
cd backend
cp .env.example .env
# Sua .env: dien DB credentials, JWT_SECRET >= 32 ky tu
npm install
npm run start:dev   # http://localhost:3001

# Frontend (terminal khac)
cd frontend
cp .env.local.example .env.local 2>/dev/null || true
npm install
npm run dev         # http://localhost:3000
```

### Tao JWT_SECRET nhanh

```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
[Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Hoac Node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Setup MySQL qua Docker (khuyen nghi cho dev)

```bash
docker compose up -d db
# Cho 30 giay de MySQL init xong
docker compose logs -f db
```

### Seed du lieu mau

```bash
# Trong backend/
mysql -u root -p smart_dormitory < migrations/seed.sql
```

### Tao tai khoan admin dau tien

Hien tai `/auth/register` chi cho phep tao tai khoan STUDENT. Tao admin bang SQL truc tiep:

```sql
USE smart_dormitory;
-- Hash mat khau "AdminPass123" (bcrypt cost 10)
INSERT INTO accounts (username, password_hash, role, status, created_at, updated_at)
VALUES (
  'admin',
  '$2b$10$replace_voi_hash_thuc_te',
  'admin',
  'active',
  NOW(),
  NOW()
);
```

Tao hash bang Node:
```js
const bcrypt = require('bcrypt');
bcrypt.hash('AdminPass123', 10).then(console.log);
```

---

## Staging deployment (VPS)

Trien khai 1 server Ubuntu 22.04 VPS (DigitalOcean, Vultr, Linode, ...).

### 1. Chuan bi server

```bash
# SSH vao server
ssh root@your-server-ip

# Update va tao user
apt update && apt upgrade -y
adduser deploy
usermod -aG sudo deploy
su - deploy

# Cai dat dependencies
sudo apt install -y nginx git curl build-essential

# Cai Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Cai MySQL 8
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Cai PM2 de chay app
sudo npm install -g pm2
```

### 2. Tao database va user MySQL

```sql
sudo mysql
CREATE DATABASE smart_dormitory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'qliktx'@'localhost' IDENTIFIED BY 'mat-khau-manh-o-day';
GRANT ALL PRIVILEGES ON smart_dormitory.* TO 'qliktx'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Clone va build

```bash
cd /home/deploy
git clone https://github.com/Tanne55/Student-Dormitory-Management-System--DMS.git app
cd app

# Backend
cd backend
cp .env.example .env
nano .env   # Dien gia tri production
npm ci
npm run build

# Frontend
cd ../frontend
cp .env.local.example .env.local 2>/dev/null || touch .env.local
# Set NEXT_PUBLIC_API_URL=https://api.your-domain.com
npm ci
npm run build
```

### 4. Env production toi thieu

`.env` backend:
```env
NODE_ENV=production
LISTEN_PORT=3001
CORS_ORIGIN=https://ktx.your-domain.com
APP_URL=https://ktx.your-domain.com

DB_HOST=localhost
DB_PORT=3306
DB_USER=qliktx
DB_PASS=mat-khau-manh-o-day
DB_NAME=smart_dormitory

JWT_SECRET=<openssl rand -hex 32>

# SMTP
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=noreply@your-domain.com
MAIL_PASS=<app-password>
MAIL_FROM=QLKTX <noreply@your-domain.com>
MAIL_SECURE=false

# VNPay production
VNPAY_TMN_CODE=<production-tmn>
VNPAY_HASH_SECRET=<production-secret>
VNPAY_URL=https://pay.vnpay.vn/vpcpay.html
VNPAY_RETURN_URL=https://ktx.your-domain.com/payment/vnpay-return

# Trust proxy: 1 hop sau nginx
TRUST_PROXY=1
```

### 5. Chay app bang PM2

```bash
cd /home/deploy/app/backend
pm2 start dist/main.js --name qliktx-api

cd /home/deploy/app/frontend
pm2 start npm --name qliktx-web -- start

pm2 save
pm2 startup   # Chay command no in ra de PM2 tu khoi dong khi reboot
```

### 6. Cau hinh Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-available/qliktx
```

```nginx
server {
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 10M;
}

server {
    server_name ktx.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/qliktx /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. HTTPS qua Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.your-domain.com -d ktx.your-domain.com
# Certbot tu them HTTPS config va auto-renew
```

### 8. Mo port firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 9. Verify

- https://api.your-domain.com → JSON greeting
- https://ktx.your-domain.com → trang dang nhap
- Dang nhap admin va kiem tra cac chuc nang chinh

---

## Production checklist

Truoc khi mo cho user thuc:

### Bao mat

- [ ] `JWT_SECRET` >= 32 ky tu va khong giong staging
- [ ] `DB_PASS` la mat khau manh khong default
- [ ] `NODE_ENV=production` (de tat TypeORM synchronize)
- [ ] `CORS_ORIGIN` chi chua domain production
- [ ] `TRUST_PROXY=1` neu sau nginx
- [ ] Swagger UI `/api` da disable hoac auth (xem note ben duoi)
- [ ] Database user khong co `GRANT ALL` rong (chi *.smart_dormitory.*)
- [ ] File `.env` co permission 600 (`chmod 600 .env`)
- [ ] HTTPS bat buoc, redirect HTTP -> HTTPS

### Du lieu

- [ ] Backup database daily (cron `mysqldump`)
- [ ] Test khoi phuc backup tren server khac
- [ ] Du `/uploads` co backup ke hoach (rsync / object storage)
- [ ] Migration strategy: convert `synchronize: true` sang TypeORM migrations

### Vận hanh

- [ ] PM2 logrotate (`pm2 install pm2-logrotate`)
- [ ] Disk usage alert (`df -h` < 80%)
- [ ] Uptime monitor (UptimeRobot, Better Stack, ...)
- [ ] Sentry / error tracking
- [ ] Tai khoan admin co MFA tren GitHub
- [ ] Document phone/email cua nguoi truc 24/7

### Tat Swagger trong production

Sua `backend/src/main.ts`:
```ts
if (process.env.NODE_ENV !== 'production') {
  SwaggerModule.setup('api', app, document);
}
```

---

## Backup va rollback

### Backup database hang ngay

```bash
# /home/deploy/backup.sh
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/home/deploy/backups
mkdir -p $BACKUP_DIR

mysqldump -u qliktx -p'mat-khau' --single-transaction smart_dormitory \
  | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Xoa backup cu hon 30 ngay
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
```

```bash
chmod +x /home/deploy/backup.sh
crontab -e
# Them dong:
0 2 * * * /home/deploy/backup.sh >> /home/deploy/backup.log 2>&1
```

### Rollback code

```bash
cd /home/deploy/app
git log --oneline -10                 # Tim commit truoc loi
git checkout <commit-hash>
cd backend && npm run build && pm2 restart qliktx-api
cd ../frontend && npm run build && pm2 restart qliktx-web
```

### Khoi phuc database

```bash
gunzip < /home/deploy/backups/db_20260516_020000.sql.gz | mysql -u qliktx -p smart_dormitory
```

---

## Troubleshooting thuong gap

### Backend khong start, loi "JWT_SECRET phai duoc cau hinh"

→ `.env` thieu hoac `JWT_SECRET` < 32 ky tu. Sinh moi va restart:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### MySQL connection refused

```bash
sudo systemctl status mysql
sudo systemctl restart mysql

# Kiem tra bind-address trong /etc/mysql/mysql.conf.d/mysqld.cnf
# Phai la 127.0.0.1 cho dev, hoac VPN IP cho prod
```

### TypeORM "Foreign key constraint fails" khi sync schema

→ `synchronize: true` co gang tao FK truoc khi du lieu match. Quy trinh:
1. Tat backend
2. Kiem tra du lieu cha (vd `room_types`) phai ton tai truoc `rooms`
3. Seed lai bang migrations/*.sql
4. Khoi dong lai

Lau dai: chuyen sang TypeORM migrations.

### Nginx 502 Bad Gateway

```bash
pm2 status                              # App con chay khong?
pm2 logs qliktx-api --lines 50          # Loi gi?
sudo tail -f /var/log/nginx/error.log   # Nginx ket noi duoc khong?
```

### Rate limit 429 sau khi deploy

`@nestjs/throttler` mac dinh dem theo IP. Neu nginx khong forward `x-forwarded-for` va backend khong `trust proxy`, moi request den tu cung 1 IP (loopback) -> bi limit cham.

Fix:
- Nginx co `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` (da co o muc 6)
- `.env` co `TRUST_PROXY=1`
- Restart backend

### VNPay tra ve "Invalid Checksum"

- Kiem tra `VNPAY_HASH_SECRET` chinh xac (khong co space dau/cuoi)
- Kiem tra `VNPAY_URL` khop voi moi truong (sandbox/production)
- Doc log: `pm2 logs qliktx-api | grep -i vnpay`

### Email reset password khong gui

```bash
# Kiem tra SMTP setting
pm2 logs qliktx-api | grep -i mail

# Test thu SMTP bang telnet
telnet smtp.gmail.com 587
```

Voi Gmail can App Password (khong dung mat khau thuong) + bat "Less secure apps" hoac App Password trong account.

---

## Lien he khi gap su co

- Code: GitHub Issues
- Server: SSH `deploy@your-server-ip`
- Database backup: `/home/deploy/backups/`
- App logs: `pm2 logs`, `/var/log/nginx/`
