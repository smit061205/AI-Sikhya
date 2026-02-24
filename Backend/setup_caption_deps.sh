#!/bin/bash

echo "Setting up Caption Generation Dependencies for SIH 2025 Platform"
echo "================================================================"

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3."
    exit 1
fi

echo "✅ pip3 found: $(pip3 --version)"

# Install Python dependencies
echo ""
echo "Installing Python dependencies..."
echo "================================"

pip3 install faster-whisper==0.10.0
pip3 install google-cloud-storage==2.10.0
pip3 install "torch>=2.2.0"
pip3 install "torchaudio>=2.2.0"

echo ""
echo "Testing core dependencies (skipping model download)..."
echo "====================================================="

# Test imports only
python3 -c "
import sys
try:
    import faster_whisper
    print('✅ faster-whisper imported successfully')
except ImportError as e:
    print(f'❌ faster-whisper import failed: {e}')
    sys.exit(1)

try:
    from google.cloud import storage
    print('✅ google-cloud-storage imported successfully')
except ImportError as e:
    print(f'❌ google-cloud-storage import failed: {e}')
    sys.exit(1)

print('✅ All core dependencies working!')
"

echo ""
echo "Making Python scripts executable..."
echo "=================================="

chmod +x scripts/transcribe_to_vtt.py
chmod +x scripts/test_caption_deps.py

echo ""
echo "✅ Setup complete! Caption generation is ready."
echo ""
echo "To test with model download (takes time), run:"
echo "python3 scripts/test_caption_deps.py"
echo ""
echo "To test caption generation on a video, use the admin panel."
