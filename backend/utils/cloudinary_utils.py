import cloudinary
import cloudinary.uploader
import cloudinary.api
from django.conf import settings

# Initialize Cloudinary config
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

def upload_to_cloudinary(file_obj, folder='insightstox/profiles'):
    """
    Upload a file to Cloudinary.
    file_obj: Django UploadedFile or file path
    """
    try:
        response = cloudinary.uploader.upload(
            file_obj,
            folder=folder,
            resource_type='auto'
        )
        return response
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        return None

def delete_from_cloudinary(public_id):
    """
    Delete a file from Cloudinary by its public ID.
    """
    try:
        response = cloudinary.uploader.destroy(public_id)
        return response
    except Exception as e:
        print(f"Cloudinary delete error: {e}")
        return None
