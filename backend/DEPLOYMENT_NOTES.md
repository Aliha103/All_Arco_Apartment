# Deployment Notes

## Critical: File Upload Configuration

### Issue
Railway uses **ephemeral filesystem** - uploaded files will be **deleted on every deployment/restart**.

### Solution Required
Configure cloud storage for production file uploads (images, PDFs, etc.).

### Recommended Options

#### Option 1: AWS S3 (Recommended)
```bash
pip install django-storages[s3] boto3
```

Add to `settings.py`:
```python
# AWS S3 Configuration
if not DEBUG:
    AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='us-east-1')
    AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=86400'}
    AWS_DEFAULT_ACL = 'public-read'

    # Media files
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
```

#### Option 2: Cloudinary
```bash
pip install cloudinary django-cloudinary-storage
```

Add to `settings.py`:
```python
# Cloudinary Configuration
if not DEBUG:
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': config('CLOUDINARY_CLOUD_NAME'),
        'API_KEY': config('CLOUDINARY_API_KEY'),
        'API_SECRET': config('CLOUDINARY_API_SECRET')
    }
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
```

#### Option 3: Railway Volumes (Limited)
Railway offers volumes, but they're expensive and limited. Not recommended for media files.

### Current Status
- ✅ **Pillow** added to requirements.txt (required for ImageField)
- ⚠️ **Cloud storage** NOT configured - files will be lost on restart
- 📝 **Action Required**: Choose and implement a cloud storage solution before going live

### Environment Variables Needed (for S3)
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_STORAGE_BUCKET_NAME=your_bucket_name
AWS_S3_REGION_NAME=us-east-1
```

### Testing After Setup
1. Upload an image via PMS Gallery
2. Verify image URL points to cloud storage (S3/Cloudinary)
3. Restart the Railway service
4. Verify image is still accessible (not deleted)

### Temporary Workaround (Development Only)
Current local filesystem storage works for:
- Development/testing
- Staging environments
- Short-term demos

**DO NOT** use for production without cloud storage!
