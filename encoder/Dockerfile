# Apple Silicon optimized Node + FFmpeg image for VideoToolbox acceleration
FROM node:20-slim

# Install system dependencies and FFmpeg with VideoToolbox support
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --omit=dev

# Copy source code
COPY src/ ./src/

# Create necessary directories
RUN mkdir -p /tmp/enc-uploads

# Set environment variables
ENV NODE_ENV=production

# Expose port (if needed)
EXPOSE 3000

# Run the application
CMD ["node", "src/index.js"]
