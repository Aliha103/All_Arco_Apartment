# 🚀 Deployment Checklist - All'Arco Apartment

Complete checklist for deploying to production on Railway.

## Pre-Deployment Setup

### 1. External Services Setup

- [ ] **Stripe Account**
  - Create account at https://stripe.com
  - Get live API keys (not test keys)
  - Set up webhook endpoint
  - Test payment flow in test mode first

- [ ] **Zeptomail Account**
  - Create account at https://www.zoho.com/zeptomail/
  - Verify domain (allarcoapartment.com)
  - Get API key
  - Configure SPF/DKIM/DMARC records

- [ ] **Domain Setup**
  - Purchase domain (if not already owned)
  - Configure DNS records
  - SSL certificate (Railway handles automatically)

### 2. Railway Project Setup

- [ ] Create Railway account
- [ ] Create new project
- [ ] Link GitHub repository

## Railway Services Configuration

### Service 1: PostgreSQL Database

```
Service Type: PostgreSQL
Name: allarco-db
```

- [ ] Create PostgreSQL service
- [ ] Note connection details (auto-generated)
- [ ] Database will be automatically provisioned

### Service 2: Redis

```
Service Type: Redis
Name: allarco-redis
```

- [ ] Create Redis service
- [ ] Note connection URL (auto-generated)

### Service 3: Django Backend

```
Service Name: backend
Root Directory: backend
Build Command: pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
Start Command: gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
```

**Environment Variables:**
```bash
SECRET_KEY=<generate-strong-secret-key>
DEBUG=False
ALLOWED_HOSTS=backend.railway.app,your-domain.com
PGDATABASE=${{Postgres.PGDATABASE}}
PGUSER=${{Postgres.PGUSER}}
PGPASSWORD=${{Postgres.PGPASSWORD}}
PGHOST=${{Postgres.PGHOST}}
PGPORT=${{Postgres.PGPORT}}
REDIS_URL=${{Redis.REDIS_URL}}
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
CSRF_TRUSTED_ORIGINS=https://your-frontend-domain.com
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
ZEPTOMAIL_API_KEY=your_api_key
```

- [ ] Create service
- [ ] Set all environment variables
- [ ] Link to PostgreSQL and Redis services
- [ ] Deploy and verify

### Service 4: Celery Worker

```
Service Name: celery-worker
Root Directory: backend
Start Command: celery -A core worker --loglevel=info
```

- [ ] Use same environment variables as backend
- [ ] Link to Redis service
- [ ] Deploy

### Service 5: Celery Beat

```
Service Name: celery-beat
Root Directory: backend
Start Command: celery -A core beat --loglevel=info
```

- [ ] Use same environment variables as backend
- [ ] Link to Redis service
- [ ] Deploy

### Service 6: Next.js Frontend

```
Service Name: frontend
Root Directory: frontend
Build Command: npm install && npm run build
Start Command: npm start
```

**Environment Variables:**
```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
```

- [ ] Create service
- [ ] Set environment variable
- [ ] Deploy and verify

## Post-Deployment Configuration

### 1. Database Setup

```bash
# Connect to backend service terminal in Railway
python manage.py migrate
python manage.py createsuperuser
python manage.py shell

# Create initial settings
>>> from apps.pricing.models import Settings
>>> Settings.objects.create(
...     default_nightly_rate=150.00,
...     cleaning_fee=50.00,
...     tourist_tax_per_person_per_night=3.50,
...     minimum_stay_nights=2,
...     maximum_stay_nights=30
... )
>>> exit()
```

- [ ] Run migrations
- [ ] Create admin user
- [ ] Create initial settings

### 2. Stripe Webhook Configuration

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://your-backend.railway.app/api/payments/webhook/`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy signing secret
6. Update `STRIPE_WEBHOOK_SECRET` in Railway backend environment variables

- [ ] Create webhook endpoint
- [ ] Configure events
- [ ] Update webhook secret
- [ ] Test webhook delivery

### 3. Domain Configuration

**Frontend Domain:**
- [ ] Add custom domain in Railway
- [ ] Update DNS records (CNAME)
- [ ] Wait for SSL certificate
- [ ] Update `NEXT_PUBLIC_API_URL` if needed

**Backend Domain:**
- [ ] Add custom domain in Railway
- [ ] Update DNS records (CNAME)
- [ ] Wait for SSL certificate
- [ ] Update `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`
- [ ] Update `ALLOWED_HOSTS`

### 4. Email Configuration

**Verify Sender Addresses:**
- [ ] Verify `reservations@allarcoapartment.com`
- [ ] Verify `check-in@allarcoapartment.com`
- [ ] Verify `support@allarcoapartment.com`

**DNS Records:**
- [ ] Add SPF record
- [ ] Add DKIM record
- [ ] Add DMARC record
- [ ] Verify in Zeptomail dashboard

**Test Emails:**
- [ ] Send test booking confirmation
- [ ] Send test payment receipt
- [ ] Send test welcome email
- [ ] Check spam folder

### 5. Admin Panel Setup

Access Django admin at `https://your-backend-domain.com/admin`

- [ ] Login with superuser
- [ ] Create test booking
- [ ] Create pricing rules (if needed)
- [ ] Create blocked dates (if needed)
- [ ] Test all CRUD operations

## Testing in Production

### Frontend Testing

- [ ] Homepage loads correctly
- [ ] Registration works
- [ ] Login works
- [ ] Booking flow works
- [ ] Payment redirects to Stripe
- [ ] Confirmation page displays after payment
- [ ] Guest dashboard loads
- [ ] PMS dashboard loads (for team/admin)
- [ ] All PMS sections accessible

### Backend Testing

- [ ] API responds correctly
- [ ] Authentication works
- [ ] Session cookies set correctly
- [ ] CORS configured properly
- [ ] All endpoints return data
- [ ] Admin panel accessible

### Payment Testing

- [ ] Use Stripe test cards first
- [ ] Test successful payment
- [ ] Test failed payment
- [ ] Test webhook delivery
- [ ] Verify booking status updates
- [ ] Check email sent
- [ ] Then test with real card

### Email Testing

- [ ] Booking confirmation arrives
- [ ] Payment receipt arrives
- [ ] Emails not in spam
- [ ] Links work correctly
- [ ] Unsubscribe works (if applicable)

## Security Checklist

- [ ] `DEBUG=False` in production
- [ ] Strong `SECRET_KEY` generated
- [ ] HTTPS enabled (Railway does this)
- [ ] `SESSION_COOKIE_SECURE=True`
- [ ] `CSRF_COOKIE_SECURE=True`
- [ ] Database credentials secure
- [ ] API keys not exposed in frontend
- [ ] Admin panel accessible only to authorized users
- [ ] CORS restricted to allowed origins
- [ ] Rate limiting configured (if needed)

## Monitoring Setup

### Error Tracking

- [ ] Set up Sentry (optional)
- [ ] Configure error notifications
- [ ] Test error reporting

### Performance Monitoring

- [ ] Monitor Railway metrics
- [ ] Set up alerts for downtime
- [ ] Monitor database queries
- [ ] Check Celery task completion

### Logging

- [ ] Check Django logs in Railway
- [ ] Monitor Celery logs
- [ ] Review email logs in admin
- [ ] Check Stripe webhook logs

## Backup Strategy

- [ ] Railway automatic backups enabled
- [ ] Database backup schedule configured
- [ ] Test restore from backup
- [ ] Document backup recovery process

## Launch Checklist

### Final Pre-Launch

- [ ] All features tested in production
- [ ] Payment flow tested with real card
- [ ] Emails delivering correctly
- [ ] PMS fully functional
- [ ] Mobile responsive
- [ ] Cross-browser tested
- [ ] Performance acceptable
- [ ] Security audit passed

### Launch Day

- [ ] Monitor error logs
- [ ] Watch webhook delivery
- [ ] Check email delivery
- [ ] Test critical flows
- [ ] Be available for issues

### Post-Launch

- [ ] Monitor for 24 hours
- [ ] Check analytics
- [ ] Review error logs
- [ ] Collect user feedback
- [ ] Document any issues

## Rollback Plan

If issues occur:

1. **Frontend Issues:**
   ```bash
   # Redeploy previous version in Railway
   git revert <commit-hash>
   git push
   ```

2. **Backend Issues:**
   ```bash
   # Redeploy previous version
   python manage.py migrate <app_name> <migration_number>
   ```

3. **Database Issues:**
   - Restore from Railway backup
   - Contact Railway support if needed

## Support Contacts

- **Railway Support:** support@railway.app
- **Stripe Support:** https://support.stripe.com
- **Zeptomail Support:** https://www.zoho.com/zeptomail/contact.html

## Success Criteria

✅ **Deployment successful when:**
- Frontend and backend both accessible
- Users can register and login
- Bookings can be created
- Payments process successfully
- Emails send correctly
- PMS accessible to team/admin
- No critical errors in logs

---

**Good luck with deployment! 🚀**
