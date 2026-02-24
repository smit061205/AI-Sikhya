const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const email = req.userEmail || "unknown";
    const fileCategory = req.body.fileCategory || "general";

    console.log("Cloudinary upload - req.route.path:", req.route?.path);
    console.log("Cloudinary upload - req.params:", req.params);

    // Special handling for course thumbnails
    if (
      req.params &&
      req.params.courseId &&
      req.route &&
      req.route.path.includes("/info")
    ) {
      console.log("Using course thumbnail configuration");
      return {
        folder: `course_thumbnails`,
        resource_type: "image",
        public_id: `course_${req.params.courseId}_${Date.now()}`,
        transformation: [
          { width: 800, height: 600, crop: "fill" },
          { quality: "auto" },
          { format: "auto" },
        ],
      };
    }

    console.log("Using default upload configuration");
    return {
      folder: `admin_uploads/${email}/${fileCategory}`,
      resource_type: "auto",
      public_id: `${Date.now()} - ${file.originalname}`,
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
});

module.exports = { upload };
