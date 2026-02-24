#!/bin/bash

# M2 GPU Video Encoder - Maximum Performance Mode
# No resource limits for best encoding performance

echo "🚀 Starting M2 GPU encoder in maximum performance mode..."

# Remove all resource limits for maximum performance
ulimit -n unlimited   # Unlimited file descriptors
ulimit -u unlimited   # Unlimited processes
ulimit -v unlimited   # Unlimited virtual memory
ulimit -t unlimited   # Unlimited CPU time
ulimit -s unlimited   # Unlimited stack size

# Maximum Node.js memory allocation
export NODE_OPTIONS="--max-old-space-size=16384"  # 16GB

# Prevent system sleep during encoding
caffeinate -i -s &
CAFFEINATE_PID=$!

# Cleanup function
cleanup() {
    echo "🛑 Cleaning up..."
    kill $CAFFEINATE_PID 2>/dev/null
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

echo "✅ Maximum performance mode activated:"
echo "   All resource limits removed"
echo "   Node.js memory: 16GB"
echo "   Sequential encoding for stability"
echo ""

# Start the encoder with maximum performance
echo "🔥 Starting M2 GPU encoder..."
npm start

# Cleanup on exit
cleanup
