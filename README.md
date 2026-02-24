# Course Selling App with Multi-Platform GPU Video Processing

A full-stack course selling platform with GPU-accelerated video encoding supporting both NVIDIA GPUs (Docker) and Apple Silicon M2 (Native) for ultra-fast course content processing.

## 🚀 Features

- **Multi-Platform GPU Acceleration**:
  - NVIDIA NVENC (Docker) for 3-5x speedup
  - Apple M2 VideoToolbox (Native) for 4.1x speedup at 122 FPS
- **Course Management**: Full CRUD operations for courses
- **User Authentication**: Secure login/registration system
- **Admin Dashboard**: Course analytics and management
- **Video Streaming**: HLS and MP4 support with adaptive bitrate
- **Coupon System**: Discount codes and promotions
- **Analytics**: Course performance tracking
- **Smart Resolution Filtering**: Prevents unnecessary upscaling
- **Real-time Encoding Progress**: Live FPS and ETA monitoring

## 🖥️ Hardware Requirements

### NVIDIA GPU Setup (Docker)

- **GPU**: NVIDIA RTX 3050 or newer with NVENC support
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 50GB free space
- **Docker**: Latest version with GPU support

### Apple Silicon Setup (Native)

- **Chip**: Apple M1/M2/M3 with VideoToolbox support
- **RAM**: 16GB recommended for large videos
- **Storage**: 50GB free space
- **macOS**: 12.0+ (Monterey or newer)

## 🛠️ Setup Instructions

### Option 1: Native M2 Encoder (macOS)

#### Prerequisites

```bash
# Install Node.js via Volta (recommended)
curl https://get.volta.sh | bash
volta install node@18
```

#### Setup

```bash
cd encoder-native
cp .env.example .env
# Edit .env with your GCP credentials path
npm install
```

#### Run Native Encoder

```bash
# Start with monitoring
./start-encoder.sh

# Or run directly
npm start
```

#### Performance (M2 Chip)

- **Speed**: 122 FPS @ 4.1x real-time
- **GPU Usage**: 16-17% efficient utilization
- **Power**: ~62mW consumption
- **10-hour video**: Completes in ~3 hours (all resolutions)

### Option 2: Docker Encoder (NVIDIA)

#### Prerequisites

```bash
# Install NVIDIA Docker Runtime
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker
```

#### Setup and Run

```bash
cd Backend
# Build encoder with GPU support
docker build -t vod-encoder:local ./encoder

# Run with GPU acceleration
docker run -d \
  --name vod-encoder \
  --restart unless-stopped \
  --gpus all \
  --env-file "./encoder/.env" \
  -v "$(pwd)/gcp-credentials.json":/secrets/key.json:ro \
  vod-encoder:local

# Verify GPU access
docker exec vod-encoder nvidia-smi
```

### Backend & Frontend Setup

#### Backend

```bash
cd Backend
npm install
cp .env.example .env
# Configure MongoDB, GCP, and other settings
npm run dev
```

#### Frontend

```bash
cd Frontend
npm install
cp .env.example .env
# Configure API endpoints
npm start
```

### Google Cloud Setup

1. Create GCP project and enable Cloud Storage API
2. Create service account with Storage permissions
3. Download credentials as `gcp-credentials.json`
4. Place in `Backend/` directory
5. Update encoder `.env` files with correct paths

## 🎯 Performance Comparison

### Native M2 Encoder

- **Hardware**: Apple M2 VideoToolbox
- **Speed**: 122 FPS (4.1x real-time)
- **GPU Usage**: 16-17%
- **Power**: 62mW
- **Best for**: macOS development, energy efficiency

### Docker NVIDIA Encoder

- **Hardware**: NVIDIA NVENC
- **Speed**: 3-5x real-time (varies by GPU)
- **GPU Usage**: 80-90%
- **Power**: Higher consumption
- **Best for**: Linux servers, high throughput

### Encoding Features (Both)

- **Resolutions**: 1080p, 720p, 480p HLS + MP4
- **Smart Filtering**: Skips unnecessary upscaling
- **Formats**: HLS segments, master playlist, thumbnail
- **Sequential Processing**: Prevents memory conflicts

## 📁 Project Structure

```
course-selling-app/
├── Backend/
│   ├── controllers/        # API controllers
│   ├── models/            # Database models
│   ├── middleware/        # Auth & error handling
│   └── gcp-credentials.json
├── Frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   └── api/          # API calls
│   └── public/
├── encoder/               # Docker NVIDIA encoder
│   ├── src/              # GPU encoding logic
│   ├── Dockerfile        # NVIDIA-enabled container
│   └── .env
├── encoder-native/        # Native M2 encoder
│   ├── src/
│   │   └── index.js      # M2 VideoToolbox encoder
│   ├── start-encoder.sh  # Launch script
│   ├── gpu-monitor.js    # Performance monitoring
│   └── .env
└── README.md
```

## 🔧 Troubleshooting

### Native M2 Encoder Issues

```bash
# Check VideoToolbox support
system_profiler SPDisplaysDataType

# Monitor encoding process
tail -f encoder-native/logs/encoder.log

# Check GPU usage
./encoder-native/gpu-monitor.js
```

### Docker NVIDIA Issues

```bash
# Check NVIDIA drivers
nvidia-smi

# Verify Docker GPU support
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi

# Check encoder logs
docker logs vod-encoder
```

### Common Solutions

- **M2 Code 234 errors**: Use sequential encoding (already implemented)
- **Memory issues**: Increase Node.js memory limit in start script
- **GCP auth**: Verify credentials path in .env files
- **Pub/Sub**: Check subscription and topic configuration

## 🚀 Deployment

### Production Recommendations

**For macOS Servers:**

- Use native M2 encoder for energy efficiency
- Set up process monitoring (PM2)
- Configure log rotation

**For Linux Servers:**

- Use Docker NVIDIA encoder for scalability
- Set up container orchestration (Docker Swarm/K8s)
- Configure GPU resource limits

**Cloud Deployment:**

- **AWS**: EC2 Mac instances (M2) or G4 instances (NVIDIA)
- **GCP**: Compute Engine with T4/V100 GPUs
- **Azure**: NCv3 series VMs

## 📝 API Documentation

### Course Management

- `GET /api/courses` - List courses
- `POST /api/courses` - Create course
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

### Video Processing

- `POST /api/upload` - Upload video for encoding
- `GET /api/video/:id/status` - Check encoding status
- `POST /admin/videos/:id/encoded` - Encoding callback

### Analytics

- `GET /api/analytics/courses` - Course performance
- `GET /api/analytics/revenue` - Revenue tracking

## 🤝 Contributing

1. Fork the repository
2. Choose your encoder platform (M2 native or NVIDIA Docker)
3. Create feature branch
4. Test on your target platform
5. Submit Pull Request with platform-specific notes

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

**For M2 Native Encoder:**

- Ensure macOS 12.0+ and VideoToolbox support
- Check Node.js version compatibility
- Monitor memory usage for large videos

**For NVIDIA Docker Encoder:**

- Verify NVIDIA driver compatibility
- Check Docker GPU runtime installation
- Monitor GPU memory during encoding

**General Issues:**

- Create GitHub issue with platform details
- Include encoder logs and system specs
- Provide video file characteristics for encoding issues
