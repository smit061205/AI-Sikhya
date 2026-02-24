#!/usr/bin/env python3
"""
Test script to verify caption generation dependencies and GCP connection
"""
import sys
import os

def test_imports():
    """Test if all required packages can be imported"""
    print("Testing Python imports...")
    
    try:
        import faster_whisper
        print("✓ faster-whisper imported successfully")
    except ImportError as e:
        print(f"✗ faster-whisper import failed: {e}")
        return False
    
    try:
        from google.cloud import storage
        print("✓ google-cloud-storage imported successfully")
    except ImportError as e:
        print(f"✗ google-cloud-storage import failed: {e}")
        return False
    
    return True

def test_gcp_connection():
    """Test GCP connection and credentials"""
    print("\nTesting GCP connection...")
    
    try:
        from google.cloud import storage
        
        # Check if credentials file exists
        creds_path = "/Users/smitthakkar/Downloads/SIH/Backend/gcp-credentials.json"
        if not os.path.exists(creds_path):
            print(f"✗ GCP credentials file not found at: {creds_path}")
            return False
        
        print(f"✓ GCP credentials file found")
        
        # Test storage client initialization
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = creds_path
        client = storage.Client()
        print("✓ GCP Storage client initialized successfully")
        
        # Test bucket access
        bucket_name = "dev-airlock-471717-b0-vod-public"
        bucket = client.bucket(bucket_name)
        
        # Try to list a few objects (this will fail if no access)
        blobs = list(bucket.list_blobs(max_results=1))
        print(f"✓ Successfully accessed bucket: {bucket_name}")
        
        return True
        
    except Exception as e:
        print(f"✗ GCP connection failed: {e}")
        return False

def test_whisper_model():
    """Test Whisper model loading"""
    print("\nTesting Whisper model loading...")
    
    try:
        from faster_whisper import WhisperModel
        
        print("Loading tiny model for testing...")
        model = WhisperModel("tiny", device="cpu", compute_type="int8")
        print("✓ Whisper model loaded successfully")
        
        return True
        
    except Exception as e:
        print(f"✗ Whisper model loading failed: {e}")
        return False

def main():
    print("Caption Generation Dependency Test")
    print("=" * 40)
    
    all_tests_passed = True
    
    # Test imports
    if not test_imports():
        all_tests_passed = False
    
    # Test GCP connection
    if not test_gcp_connection():
        all_tests_passed = False
    
    # Test Whisper model
    if not test_whisper_model():
        all_tests_passed = False
    
    print("\n" + "=" * 40)
    if all_tests_passed:
        print("✓ All tests passed! Caption generation should work.")
    else:
        print("✗ Some tests failed. Please fix the issues above.")
        print("\nTo install missing dependencies, run:")
        print("pip3 install -r requirements.txt")
    
    return 0 if all_tests_passed else 1

if __name__ == "__main__":
    sys.exit(main())
