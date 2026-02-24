#!/usr/bin/env python3
import subprocess
import sys

# Run the debug script for the failing video asset
bucket_name = "dev-airlock-471717-b0-vod-public"
asset_prefix = "assets/689897f742b2a2c9c879dda7/68c3404bfe45d3b81afbe8c1/68c358d7c2ba0b5e3691b43b"

print(f"🔍 Debugging GCS bucket contents for failing video asset...")
print(f"Bucket: {bucket_name}")
print(f"Asset: {asset_prefix}")
print("-" * 80)

try:
    result = subprocess.run([
        sys.executable, 
        "/Users/smitthakkar/Downloads/SIH/Backend/scripts/debug_gcs_bucket.py",
        bucket_name,
        asset_prefix
    ], capture_output=True, text=True, timeout=30)
    
    print("STDOUT:")
    print(result.stdout)
    
    if result.stderr:
        print("STDERR:")
        print(result.stderr)
        
    print(f"Exit code: {result.returncode}")
    
except subprocess.TimeoutExpired:
    print("❌ Debug script timed out")
except Exception as e:
    print(f"❌ Error running debug script: {e}")
