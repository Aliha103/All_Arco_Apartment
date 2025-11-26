# 🐳 Docker Quick Start - Local Development

Get the entire platform running with one command.

## Prerequisites

- Docker Desktop installed (includes docker-compose)
- 8GB RAM minimum
- 20GB disk space

## Quick Start (5 Minutes)

### 1. Clone Repository

```bash
git clone <repository-url>
cd All_Arco_Apartment
```

### 2. Start Everything

```bash
docker-compose up --build
```

That's it! All services will start:
- PostgreSQL database
- Redis cache
- Django backend
- Next.js frontend
- Nginx reverse proxy
- Celery worker
- Celery beat scheduler

### 3. Access Application

**Frontend:** http://localhost:8080

**Backend API:** http://localhost:8080/api

**Django Admin:** http://localhost:8080/admin

**Health Check:** http://localhost:8080/health

### 4. Create Admin User

Open a new terminal while containers are running:

```bash
docker-compose exec app bash
cd /app/backend
python manage.py createsuperuser
exit
```

Follow prompts to create admin account.

---

## What's Running?

### Services in the Container:

1. **Nginx** (Port 8080)
   - Reverse proxy
   - Routes /api → Django
   - Routes / → Next.js
   - Serves static files

2. **Django + Gunicorn** (Internal Port 8000)
   - REST API backend
   - Django admin panel
   - 3 workers

3. **Next.js** (Internal Port 3000)
   - React frontend
   - Server-side rendering

4. **Celery Worker**
   - Background task processing
   - Email sending

5. **Celery Beat**
   - Scheduled tasks
   - Email reminders

### External Services:

- **PostgreSQL** (Port 5432) - Database
- **Redis** (Port 6379) - Cache & Celery broker

---

## Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app

# Django logs only
docker-compose exec app tail -f /var/log/supervisor/django.log

# Next.js logs only
docker-compose exec app tail -f /var/log/supervisor/nextjs.log
```

### Stop Everything

```bash
docker-compose down
```

### Stop and Remove Volumes (Clean Restart)

```bash
docker-compose down -v
```

### Rebuild After Code Changes

```bash
docker-compose up --build
```

### Access Container Shell

```bash
docker-compose exec app bash
```

### Run Django Commands

```bash
# Migrations
docker-compose exec app python /app/backend/manage.py migrate

# Create superuser
docker-compose exec app python /app/backend/manage.py createsuperuser

# Django shell
docker-compose exec app python /app/backend/manage.py shell

# Collect static files
docker-compose exec app python /app/backend/manage.py collectstatic
```

### View Database

```bash
docker-compose exec postgres psql -U postgres -d allarco
```

### Check Redis

```bash
docker-compose exec redis redis-cli
> PING
PONG
> exit
```

---

## Configuration

### Environment Variables

Edit `docker-compose.yml` to change:
- Database credentials
- Stripe API keys
- Zeptomail API key
- Domain names

### Ports

Change exposed port in `docker-compose.yml`:

```yaml
services:
  app:
    ports:
      - "3000:8080"  # Access on port 3000 instead
```

---

## Development Workflow

### 1. Make Code Changes

**Backend changes:**
- Edit files in `backend/`
- Restart container: `docker-compose restart app`

**Frontend changes:**
- Edit files in `frontend/`
- Next.js will hot-reload automatically (if using dev mode)
- For production build, rebuild: `docker-compose up --build`

### 2. Add Python Packages

```bash
# Add to backend/requirements.txt
echo "new-package==1.0.0" >> backend/requirements.txt

# Rebuild
docker-compose up --build
```

### 3. Add Node Packages

```bash
# Add to frontend/package.json manually or:
docker-compose exec app bash
cd /app/frontend
npm install new-package
exit

# Rebuild
docker-compose up --build
```

### 4. Database Migrations

```bash
# After model changes
docker-compose exec app bash
cd /app/backend
python manage.py makemigrations
python manage.py migrate
exit
```

---

## Testing

### Run Backend Tests

```bash
docker-compose exec app python /app/backend/manage.py test
```

### Check Frontend

```bash
docker-compose exec app bash
cd /app/frontend
npm run lint
npm run build
```

---

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker-compose logs app
```

**Common issues:**
- Port 8080 already in use → Change port in docker-compose.yml
- Not enough memory → Increase Docker Desktop memory limit
- PostgreSQL not ready → Wait 30 seconds and try again

### Database Connection Error

**Check PostgreSQL is running:**
```bash
docker-compose ps postgres
```

**Check connection:**
```bash
docker-compose exec postgres pg_isready -U postgres
```

### Redis Connection Error

**Check Redis is running:**
```bash
docker-compose exec redis redis-cli ping
```

### "502 Bad Gateway" Error

**Causes:**
- Django not started yet (wait 30 seconds)
- Django crashed (check logs)

**Fix:**
```bash
docker-compose logs app | grep django
docker-compose restart app
```

### Static Files Not Loading

**Recollect static files:**
```bash
docker-compose exec app python /app/backend/manage.py collectstatic --noinput
docker-compose restart app
```

---

## Clean Start

If things get messed up:

```bash
# Stop everything
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Remove all containers
docker system prune -a

# Start fresh
docker-compose up --build
```

---

## Production Build

This docker-compose is for development. For production:

1. Use the Railway deployment (see RAILWAY_GODADDY_SETUP.md)
2. Or build production image:

```bash
docker build -t allarco-app .
docker run -p 8080:8080 --env-file .env.docker allarco-app
```

---

## Performance Tips

### Speed Up Builds

Add to `docker-compose.yml`:

```yaml
services:
  app:
    build:
      cache_from:
        - allarco-app:latest
```

### Reduce Memory Usage

Modify `docker-compose.yml`:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

---

## Next Steps

1. ✅ Local development running
2. 📝 Make your changes
3. 🧪 Test locally
4. 🚀 Deploy to Railway (see RAILWAY_GODADDY_SETUP.md)

---

**Happy Coding! 🐳**
