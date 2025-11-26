#!/bin/bash
set -e

echo "Starting All'Arco Apartment..."

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
until PGPASSWORD=$PGPASSWORD psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "PostgreSQL is up"

# Wait for Redis
echo "Waiting for Redis..."
until redis-cli -u "$REDIS_URL" ping 2>/dev/null; do
  echo "Redis is unavailable - sleeping"
  sleep 2
done
echo "Redis is up"

# Navigate to backend directory
cd /app/backend

# Run Django migrations
echo "Running Django migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Create default settings if not exists
echo "Checking for default settings..."
python manage.py shell << PYTHON_EOF
from apps.pricing.models import Settings
if not Settings.objects.exists():
    print("Creating default settings...")
    Settings.objects.create(
        default_nightly_rate=150.00,
        cleaning_fee=50.00,
        tourist_tax_per_person_per_night=3.50,
        minimum_stay_nights=2,
        maximum_stay_nights=30
    )
    print("Default settings created")
else:
    print("Settings already exist")
PYTHON_EOF

echo "Initialization complete. Starting services..."

# Execute CMD
exec "$@"
