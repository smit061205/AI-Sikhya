#!/usr/bin/env python3
"""
Debug script to list GCS bucket contents for video assets
"""

import os
import sys
from google.cloud import storage
from google.oauth2 import service_account

def list_bucket_contents(bucket_name, prefix=""):
    """List all objects in a GCS bucket with optional prefix"""
    try:
        # Load credentials
        credentials_path = "/Users/smitthakkar/Downloads/SIH/Backend/gcp-credentials.json"
        credentials = service_account.Credentials.from_service_account_file(credentials_path)
        
        # Initialize client
        client = storage.Client(credentials=credentials, project="dev-airlock-471717-b0")
        bucket = client.bucket(bucket_name)
        
        print(f"🔍 Listing contents of bucket: {bucket_name}")
        if prefix:
            print(f"📁 Prefix: {prefix}")
        print("-" * 80)
        
        # List objects
        blobs = bucket.list_blobs(prefix=prefix)
        found_objects = []
        
        for blob in blobs:
            size_mb = blob.size / (1024 * 1024) if blob.size else 0
            print(f"📄 {blob.name} ({size_mb:.2f} MB)")
            found_objects.append(blob.name)
        
        if not found_objects:
            print("❌ No objects found!")
        else:
            print(f"\n✅ Found {len(found_objects)} objects")
            
        return found_objects
        
    except Exception as e:
        print(f"❌ Error listing bucket contents: {e}")
        return []

def main():
    if len(sys.argv) < 2:
        print("Usage: python debug_gcs_bucket.py <bucket_name> [prefix]")
        sys.exit(1)
    
    bucket_name = sys.argv[1]
    prefix = sys.argv[2] if len(sys.argv) > 2 else ""
    
    list_bucket_contents(bucket_name, prefix)

if __name__ == "__main__":
    main()
