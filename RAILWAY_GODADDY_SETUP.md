# 🚀 Railway + GoDaddy Deployment Guide

Complete guide to deploy All'Arco Apartment on Railway with GoDaddy domain.

## Overview

This setup uses:
- **Single Docker Container** - Frontend (Next.js) + Backend (Django) + Nginx
- **Railway** - Application hosting
- **GoDaddy** - Domain management (allarcoapartment.com)
- **Railway PostgreSQL** - Database service
- **Railway Redis** - Cache and Celery broker

---

## Part 1: Railway Setup (30 minutes)

### Step 1: Create Railway Project

1. Go to https://railway.app and sign up/login
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account
5. Select the All'Arco Apartment repository
6. Project will be created

### Step 2: Add PostgreSQL Database

1. Click "+ New" in your Railway project
2. Select "Database"
3. Choose "PostgreSQL"
4. Database will be provisioned automatically
5. Note the connection details (available in Variables tab)

### Step 3: Add Redis

1. Click "+ New" in your Railway project
2. Select "Database"
3. Choose "Redis"
4. Redis will be provisioned automatically
5. Note the connection URL (available in Variables tab)

### Step 4: Configure Main Application Service

1. Click on your GitHub deployment service
2. Go to "Settings" tab

**Configure Build:**
- Root Directory: `/` (leave empty)
- Builder: `DOCKERFILE`
- Dockerfile Path: `Dockerfile`
- Build Command: (leave empty)

**Configure Deploy:**
- Port: `8080` (Railway will expose this automatically)
- Health Check Path: `/health`
- Restart Policy: `ON_FAILURE`

### Step 5: Set Environment Variables

In the "Variables" tab, add these variables:

**Click "New Variable" and add each:**

```bash
# Django Settings
SECRET_KEY=<generate-strong-32-char-random-string>
DEBUG=False
ALLOWED_HOSTS=${{RAILWAY_PUBLIC_DOMAIN}},allarcoapartment.com,www.allarcoapartment.com

# Database (reference Railway PostgreSQL)
PGDATABASE=${{Postgres.PGDATABASE}}
PGUSER=${{Postgres.PGUSER}}
PGPASSWORD=${{Postgres.PGPASSWORD}}
PGHOST=${{Postgres.PGHOST}}
PGPORT=${{Postgres.PGPORT}}

# Redis (reference Railway Redis)
REDIS_URL=${{Redis.REDIS_URL}}

# CORS & CSRF
CORS_ALLOWED_ORIGINS=https://${{RAILWAY_PUBLIC_DOMAIN}},https://allarcoapartment.com,https://www.allarcoapartment.com
CSRF_TRUSTED_ORIGINS=https://${{RAILWAY_PUBLIC_DOMAIN}},https://allarcoapartment.com,https://www.allarcoapartment.com

# Stripe (get from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_live_your_actual_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret

# Zeptomail (get from Zeptomail Dashboard)
ZEPTOMAIL_API_KEY=your_actual_api_key

# Next.js
NEXT_PUBLIC_API_URL=https://allarcoapartment.com/api
```

**Important Notes:**
- Replace `<generate-strong-32-char-random-string>` with actual random string
- `${{Postgres.VARIABLE}}` syntax references the PostgreSQL service variables
- `${{Redis.REDIS_URL}}` references the Redis service variable
- `${{RAILWAY_PUBLIC_DOMAIN}}` is automatically provided by Railway

**To generate SECRET_KEY:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Step 6: Deploy

1. Click "Deploy" button
2. Watch the build logs
3. First deploy will take 5-10 minutes
4. Check deployment status

### Step 7: Verify Deployment

Once deployed, Railway will provide a URL like: `https://your-app.railway.app`

Test these URLs:
- `https://your-app.railway.app/health` - Should return "healthy"
- `https://your-app.railway.app/` - Should show homepage
- `https://your-app.railway.app/admin/` - Should show Django admin login

### Step 8: Create Admin User

1. Click on your service in Railway dashboard
2. Go to "Logs" tab
3. Click the "..." menu → "Open Shell"
4. Run these commands:

```bash
cd /app/backend
python manage.py createsuperuser
# Follow prompts to create admin account
```

---

## Part 2: GoDaddy DNS Configuration (15 minutes)

### Step 1: Get Railway Domain Info

1. In Railway, click on your service
2. Go to "Settings" tab
3. Scroll to "Networking" section
4. Note your Railway domain: `your-app.railway.app`
5. Click "Generate Domain" if needed

### Step 2: Configure GoDaddy DNS

1. Log in to GoDaddy: https://account.godaddy.com
2. Go to "My Products"
3. Find "allarcoapartment.com" and click "DNS"

### Step 3: Add DNS Records

Delete any existing A/CNAME records for @ and www, then add:

**Record 1: Root Domain (@)**
```
Type: CNAME
Name: @
Value: your-app.railway.app
TTL: 600 seconds
```

**Record 2: WWW Subdomain**
```
Type: CNAME
Name: www
Value: your-app.railway.app
TTL: 600 seconds
```

**Note:** Some DNS providers don't allow CNAME for root (@). If GoDaddy shows an error, use:

**Alternative for Root Domain:**
```
Type: A
Name: @
Value: <Railway IP Address>
TTL: 600 seconds
```

To get Railway IP, run: `ping your-app.railway.app`

### Step 4: Wait for DNS Propagation

- DNS changes take 5-60 minutes to propagate
- Check status: https://dnschecker.org (enter allarcoapartment.com)
- Wait until most locations show your Railway domain

---

## Part 3: Railway Custom Domain (10 minutes)

### Step 1: Add Custom Domain to Railway

1. Go to Railway project
2. Click on your service
3. Go to "Settings" tab
4. Scroll to "Networking" → "Custom Domains"
5. Click "Custom Domain"

### Step 2: Add Both Domains

**Add Domain 1:**
- Enter: `allarcoapartment.com`
- Click "Add"

**Add Domain 2:**
- Enter: `www.allarcoapartment.com`
- Click "Add"

### Step 3: Verify SSL Certificate

- Railway will automatically provision SSL certificates
- Wait 2-5 minutes for certificates to be issued
- You'll see "✓" when certificate is active

### Step 4: Set Primary Domain

1. Click the "..." menu next to `allarcoapartment.com`
2. Select "Set as Primary"
3. This ensures www redirects to non-www

---

## Part 4: Stripe Webhook Configuration (10 minutes)

### Step 1: Access Stripe Dashboard

1. Go to https://dashboard.stripe.com
2. Login to your account
3. Make sure you're in LIVE mode (not Test mode)

### Step 2: Create Webhook Endpoint

1. Go to "Developers" → "Webhooks"
2. Click "+ Add endpoint"

**Configure Webhook:**
- Endpoint URL: `https://allarcoapartment.com/api/payments/webhook/`
- Description: "All'Arco Apartment Production"
- Events to send: Select these events:
  - ✓ `checkout.session.completed`
  - ✓ `payment_intent.succeeded`
  - ✓ `payment_intent.payment_failed`
  - ✓ `charge.refunded`
- Click "Add endpoint"

### Step 3: Get Signing Secret

1. Click on the webhook you just created
2. Scroll to "Signing secret"
3. Click "Reveal" and copy the secret (starts with `whsec_`)
4. Go back to Railway
5. Update environment variable:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_your_actual_secret`
6. Click "Deploy" to restart with new secret

### Step 4: Test Webhook

1. In Stripe Dashboard, click "Send test webhook"
2. Select `checkout.session.completed`
3. Click "Send test webhook"
4. Should see "Success" response

---

## Part 5: Email Configuration (Zeptomail) (15 minutes)

### Step 1: Verify Domain in Zeptomail

1. Go to https://www.zoho.com/zeptomail/
2. Login to your account
3. Go to "Mail Agents" → "Add Mail Agent"
4. Enter domain: `allarcoapartment.com`
5. Zeptomail will provide DNS records

### Step 2: Add DNS Records to GoDaddy

Go back to GoDaddy DNS and add these records from Zeptomail:

**SPF Record:**
```
Type: TXT
Name: @
Value: v=spf1 include:zoho.com ~all
TTL: 600
```

**DKIM Record:**
```
Type: TXT
Name: zeptomail._domainkey
Value: <provided by Zeptomail>
TTL: 600
```

**DMARC Record:**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:support@allarcoapartment.com
TTL: 600
```

### Step 3: Verify in Zeptomail

1. Go back to Zeptomail
2. Click "Verify" on your domain
3. Wait 5-10 minutes for DNS propagation
4. Domain should show as "Verified"

### Step 4: Add Sender Addresses

In Zeptomail, add these sender addresses:
- `reservations@allarcoapartment.com`
- `check-in@allarcoapartment.com`
- `support@allarcoapartment.com`

Each will need email verification.

### Step 5: Get API Key

1. Go to "Settings" → "API"
2. Click "Generate Token"
3. Copy the API key
4. Add to Railway environment variables:
   - Name: `ZEPTOMAIL_API_KEY`
   - Value: `your_actual_api_key`

---

## Part 6: Final Testing (15 minutes)

### Test 1: Homepage
- Visit: https://allarcoapartment.com
- Should load without errors
- Check browser console for errors

### Test 2: Registration
- Go to: https://allarcoapartment.com/auth/register
- Create a test account
- Should receive welcome email

### Test 3: Login
- Go to: https://allarcoapartment.com/auth/login
- Login with test account
- Should redirect to dashboard

### Test 4: Booking Flow (Test Mode First!)
1. Go to: https://allarcoapartment.com/book
2. Select dates
3. Enter guest information
4. Should redirect to Stripe Checkout
5. Use test card: `4242 4242 4242 4242`
6. Should redirect to confirmation page
7. Check email for confirmation

### Test 5: Admin Panel
- Go to: https://allarcoapartment.com/admin/
- Login with superuser account
- Verify all models are accessible

### Test 6: PMS Dashboard
- Login as admin
- Go to: https://allarcoapartment.com/pms/
- Test all 9 sections
- Verify data loads correctly

---

## Troubleshooting

### Issue: "Application Error" on Railway

**Solution:**
1. Check Railway logs: Click service → "Logs" tab
2. Look for error messages
3. Common issues:
   - Missing environment variables
   - Database connection failed
   - Redis connection failed

### Issue: DNS not resolving

**Solution:**
1. Check DNS propagation: https://dnschecker.org
2. Wait 1 hour and try again
3. Verify CNAME records in GoDaddy are correct
4. Try flushing DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)

### Issue: SSL Certificate Error

**Solution:**
1. Wait 5-10 minutes for Railway to provision certificate
2. Check Railway "Settings" → "Networking" for certificate status
3. If still failing, remove and re-add custom domain

### Issue: Stripe Webhook Failing

**Solution:**
1. Check webhook signing secret matches Railway environment variable
2. Verify webhook URL is exactly: `https://allarcoapartment.com/api/payments/webhook/`
3. Check Railway logs for webhook errors
4. Test with Stripe CLI: `stripe listen --forward-to https://allarcoapartment.com/api/payments/webhook/`

### Issue: Emails Not Sending

**Solution:**
1. Verify domain in Zeptomail is verified
2. Check DNS records are correct
3. Verify API key in Railway matches Zeptomail
4. Check Railway logs for email errors
5. Test email manually from Django shell

### Issue: Static Files Not Loading

**Solution:**
1. Check Railway logs for collectstatic errors
2. Verify Nginx configuration
3. Restart service: Railway dashboard → "Deploy Latest"

---

## Monitoring & Maintenance

### Check Application Health

**Railway Dashboard:**
- Monitor CPU/Memory usage
- Check error logs regularly
- Set up alerts

**Health Check Endpoint:**
- https://allarcoapartment.com/health
- Should always return "healthy"
- Set up external monitoring (UptimeRobot, Pingdom)

### Database Backups

Railway provides automatic backups:
1. Go to PostgreSQL service
2. Click "Backups" tab
3. Configure backup schedule
4. Test restore process

### Updating the Application

**To deploy updates:**
1. Push changes to GitHub
2. Railway automatically deploys
3. Watch deployment logs
4. Test after deployment

**Rollback if needed:**
1. Go to Railway dashboard
2. Click "Deployments" tab
3. Find previous working deployment
4. Click "..." → "Redeploy"

---

## Production Checklist

Before going live, verify:

- [ ] Custom domain working (both www and non-www)
- [ ] SSL certificates active
- [ ] Database connected and migrations run
- [ ] Redis connected
- [ ] Admin user created
- [ ] Stripe webhook configured and tested
- [ ] Zeptomail domain verified
- [ ] Test booking completed successfully
- [ ] Emails sending correctly
- [ ] All PMS features working
- [ ] Mobile responsive
- [ ] Error monitoring set up
- [ ] Backups configured
- [ ] Health checks passing

---

## Support Resources

- **Railway Docs:** https://docs.railway.app
- **GoDaddy Support:** https://www.godaddy.com/help
- **Stripe Docs:** https://stripe.com/docs
- **Zeptomail Docs:** https://www.zoho.com/zeptomail/help/

---

## Estimated Total Time

- Railway Setup: 30 minutes
- GoDaddy DNS: 15 minutes
- Custom Domain: 10 minutes
- Stripe Webhook: 10 minutes
- Email Configuration: 15 minutes
- Testing: 15 minutes
- **Total: ~1.5 hours**

Plus DNS propagation wait time (30-60 minutes)

---

**🎉 Congratulations! Your platform is now live at https://allarcoapartment.com**
