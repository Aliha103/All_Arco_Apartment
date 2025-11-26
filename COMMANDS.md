# 🎯 Essential Commands - Quick Reference

## Local Development (Docker)

### Start Everything
```bash
docker-compose up --build
```

### Stop Everything
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f
```

### Access Container
```bash
docker-compose exec app bash
```

### Create Admin User
```bash
docker-compose exec app python /app/backend/manage.py createsuperuser
```

---

## Railway Deployment

### Install CLI
```bash
npm install -g railway
```

### Login
```bash
railway login
```

### Deploy
```bash
git push
# Railway auto-deploys from GitHub
```

### View Logs
```bash
railway logs
```

### Open Shell
```bash
railway shell
```

---

## Django Management

### Run Migrations
```bash
# Local
docker-compose exec app python /app/backend/manage.py migrate

# Railway
railway run python /app/backend/manage.py migrate
```

### Create Superuser
```bash
# Local
docker-compose exec app python /app/backend/manage.py createsuperuser

# Railway
railway run python /app/backend/manage.py createsuperuser
```

### Django Shell
```bash
# Local
docker-compose exec app python /app/backend/manage.py shell

# Railway
railway run python /app/backend/manage.py shell
```

### Collect Static Files
```bash
# Local
docker-compose exec app python /app/backend/manage.py collectstatic --noinput

# Railway
railway run python /app/backend/manage.py collectstatic --noinput
```

---

## Database Commands

### Access PostgreSQL
```bash
# Local
docker-compose exec postgres psql -U postgres -d allarco

# Railway
railway connect Postgres
```

### Backup Database
```bash
# Local
docker-compose exec postgres pg_dump -U postgres allarco > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres allarco < backup.sql
```

---

## Testing

### Run Tests
```bash
docker-compose exec app python /app/backend/manage.py test
```

### Check Frontend Build
```bash
docker-compose exec app bash -c "cd /app/frontend && npm run build"
```

### Run Linter
```bash
docker-compose exec app bash -c "cd /app/frontend && npm run lint"
```

---

## Troubleshooting

### Check Health
```bash
curl http://localhost:8080/health
```

### Restart Service
```bash
docker-compose restart app
```

### View Specific Logs
```bash
# Django
docker-compose exec app tail -f /var/log/supervisor/django.log

# Next.js
docker-compose exec app tail -f /var/log/supervisor/nextjs.log

# Nginx
docker-compose exec app tail -f /var/log/nginx/access.log
```

### Clean Restart
```bash
docker-compose down -v
docker-compose up --build
```

---

## Stripe Testing

### Test Webhook Locally
```bash
stripe listen --forward-to http://localhost:8080/api/payments/webhook/
```

### Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`

---

## DNS Commands

### Check DNS Propagation
```bash
nslookup allarcoapartment.com
```

### Check DNS Globally
Visit: https://dnschecker.org

### Flush DNS Cache
```bash
# Windows
ipconfig /flushdns

# Mac
sudo dscacheutil -flushcache

# Linux
sudo systemd-resolve --flush-caches
```

---

## Monitoring

### Check Service Status
```bash
docker-compose ps
```

### Check Resource Usage
```bash
docker stats
```

### Follow All Logs
```bash
docker-compose logs -f --tail=100
```

---

## Quick Deploy Checklist

```bash
# 1. Test locally
docker-compose up --build

# 2. Commit changes
git add .
git commit -m "Your changes"

# 3. Push to GitHub
git push origin main

# 4. Railway auto-deploys
# Monitor at: railway.app

# 5. Check deployment
curl https://allarcoapartment.com/health
```

---

## Emergency Commands

### Stop Everything
```bash
docker-compose down
```

### Rollback Railway
```bash
# In Railway dashboard:
# Deployments → Previous version → Redeploy
```

### Restore Database
```bash
# In Railway dashboard:
# PostgreSQL → Backups → Restore
```

---

## URLs Reference

**Local:**
- Frontend: http://localhost:8080
- Admin: http://localhost:8080/admin
- API: http://localhost:8080/api
- Health: http://localhost:8080/health

**Production:**
- Frontend: https://allarcoapartment.com
- Admin: https://allarcoapartment.com/admin
- API: https://allarcoapartment.com/api
- Health: https://allarcoapartment.com/health

---

## Environment Variables

### Generate Secret Key
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Check Current Variables
```bash
# Railway
railway vars

# Docker
docker-compose exec app env | grep STRIPE
```

---

**💡 Tip:** Bookmark this file for quick reference!
