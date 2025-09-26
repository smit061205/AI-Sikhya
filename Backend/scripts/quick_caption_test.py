#!/usr/bin/env python3
"""
Quick caption generation test - verifies setup without downloading models
"""
import sys
import os

def test_basic_setup():
    """Test basic Python imports and GCP setup"""
    print("Testing Caption Generation Setup")
    print("=" * 35)
    
    # Test imports
    try:
        import faster_whisper
        print("✅ faster-whisper available")
    except ImportError as e:
        print(f"❌ faster-whisper missing: {e}")
        return False
    
    try:
        from google.cloud import storage
        print("✅ google-cloud-storage available")
    except ImportError as e:
        print(f"❌ google-cloud-storage missing: {e}")
        return False
    
    # Test GCP credentials
    creds_path = "/Users/smitthakkar/Downloads/SIH/Backend/gcp-credentials.json"
    if not os.path.exists(creds_path):
        print(f"❌ GCP credentials not found: {creds_path}")
        return False
    print("✅ GCP credentials file found")
    
    # Test GCP connection
    try:
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = creds_path
        client = storage.Client()
        bucket = client.bucket("dev-airlock-471717-b0-vod-public")
        # Just check if bucket exists, don't list contents
        bucket.reload()
        print("✅ GCP bucket accessible")
    except Exception as e:
        print(f"❌ GCP connection failed: {e}")
        return False
    
    return True

def test_script_permissions():
    """Test if transcription script is executable"""
    script_path = "/Users/smitthakkar/Downloads/SIH/Backend/scripts/transcribe_to_vtt.py"
    if not os.path.exists(script_path):
        print(f"❌ Transcription script not found: {script_path}")
        return False
    
    if not os.access(script_path, os.X_OK):
        print(f"⚠️  Transcription script not executable, fixing...")
        os.chmod(script_path, 0o755)
    
    print("✅ Transcription script ready")
    return True

def main():
    print("Quick Caption Generation Test")
    print("=" * 30)
    
    success = True
    
    if not test_basic_setup():
        success = False
    
    if not test_script_permissions():
        success = False
    
    print("\n" + "=" * 30)
    if success:
        print("✅ Caption generation setup is ready!")
        print("\nNext steps:")
        print("1. Upload a video through admin panel")
        print("2. Wait for video encoding to complete")
        print("3. Click 'Generate Captions' button")
        print("4. Check backend logs for detailed output")
    else:
        print("❌ Setup issues found. Please fix above errors.")
        print("\nTo install missing dependencies:")
        print("pip3 install faster-whisper google-cloud-storage")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
