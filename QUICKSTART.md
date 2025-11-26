# 🚀 Quick Start Guide - All'Arco Apartment

Get the platform running locally in under 10 minutes.

## Prerequisites Check

- [ ] Node.js 18+ installed
- [ ] Python 3.11+ installed
- [ ] PostgreSQL running
- [ ] Redis running

## Step 1: Clone & Navigate

```bash
git clone <repository-url>
cd All_Arco_Apartment
```

## Step 2: Backend Setup (5 minutes)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env - minimum required:
#   PGDATABASE=allarco
#   PGUSER=postgres
#   PGPASSWORD=your_password
#   SECRET_KEY=your-secret-key-here

# Setup database
python manage.py migrate

# Create admin user
python manage.py createsuperuser

# Create initial settings
python manage.py shell -c "
from apps.pricing.models import Settings
Settings.objects.create(
    default_nightly_rate=150.00,
    cleaning_fee=50.00,
    tourist_tax_per_person_per_night=3.50
)
"

# Start server
python manage.py runserver
```

Backend now running at **http://localhost:8000**

## Step 3: Frontend Setup (3 minutes)

Open new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Start development server
npm run dev
```

Frontend now running at **http://localhost:3000**

## Step 4: Start Celery (Optional - for emails)

Open two new terminals:

```bash
# Terminal 1: Celery Worker
cd backend
source venv/bin/activate
celery -A core worker --loglevel=info

# Terminal 2: Celery Beat
cd backend
source venv/bin/activate
celery -A core beat --loglevel=info
```

## 🎉 You're Ready!

### Access Points

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/api
- **Django Admin:** http://localhost:8000/admin
- **API Docs:** http://localhost:8000/api/docs/

### Test the Platform

1. **Register a guest account:**
   - Go to http://localhost:3000/auth/register
   - Fill in details, role: guest

2. **Create a test booking:**
   - Go to http://localhost:3000/book
   - Select dates, enter guest info
   - Note: Stripe payment will fail without Stripe keys (that's okay for testing)

3. **Access PMS as admin:**
   - Login with superuser at http://localhost:3000/auth/login
   - Go to http://localhost:3000/pms
   - Explore all 9 PMS sections

## Next Steps

### For Full Functionality

1. **Setup Stripe:**
   - Get API keys from https://stripe.com
   - Add to backend `.env`:
     ```
     STRIPE_SECRET_KEY=sk_test_...
     STRIPE_PUBLISHABLE_KEY=pk_test_...
     ```
   - Setup webhook: `stripe listen --forward-to localhost:8000/api/payments/webhook/`

2. **Setup Zeptomail (for emails):**
   - Get API key from https://www.zoho.com/zeptomail/
   - Add to backend `.env`:
     ```
     ZEPTOMAIL_API_KEY=your_key_here
     ```

3. **Create Test Data:**
   - Login to Django admin: http://localhost:8000/admin
   - Create some bookings, blocked dates, pricing rules

## Common Issues

**Database connection error:**
```bash
# Make sure PostgreSQL is running
sudo service postgresql start  # Linux
brew services start postgresql  # Mac
```

**Redis connection error:**
```bash
# Make sure Redis is running
sudo service redis-server start  # Linux
brew services start redis  # Mac
```

**Port already in use:**
```bash
# Frontend (change port)
npm run dev -- -p 3001

# Backend (change port)
python manage.py runserver 8001
```

**CORS errors:**
- Make sure backend `.env` includes: `CORS_ALLOWED_ORIGINS=http://localhost:3000`
- Restart backend after changing `.env`

## Development Workflow

### Making Changes

**Backend changes:**
```bash
# After model changes
python manage.py makemigrations
python manage.py migrate

# Test your changes
python manage.py test
```

**Frontend changes:**
```bash
# Automatic hot reload is enabled
# Just save and refresh browser
```

### Viewing Logs

**Backend logs:**
- Check terminal running `python manage.py runserver`
- View Django admin logs: http://localhost:8000/admin

**Frontend logs:**
- Check browser console (F12)
- Check terminal running `npm run dev`

## Ready to Deploy?

See [README.md](README.md) for deployment instructions to Railway.

## Need Help?

- Check main [README.md](README.md)
- Check [backend/README.md](backend/README.md)
- View API docs: http://localhost:8000/api/docs/

---

**Happy Coding! 🚀**
