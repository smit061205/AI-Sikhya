const express = require("express");
const { z } = require("zod");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Admin } = require("../models/admin");
const { upload } = require("../utils/cloudinary");
const adminAuthMiddleware = require("../middleware/adminAuth");
const cloudinary = require("cloudinary").v2;
const JWT_SECRET = process.env.JWT_SECRET;
const multer = require("multer");

const {
  loginAdmin,
  createCourse,
  getAdminUploads,
  deleteAdminAccount,
  deleteCourse,
  addVideoToCourse,
  updateCourse,
  updateCourseInfo,
  deleteVideo,
  updateVideo,
  getAdminProfile,
  updateAdminProfile,
  updateAdminProfilePhoto,
  getAllAdminsAsInstructors,
  adminGoogleAuth,
  createVideoUploadSession,
  getAllCourses,
  getCourseById,
  generateVideoUploadUrl,
  markVideoUploadComplete,
  adminSendPasswordResetOTP,
  adminVerifyPasswordResetOTP,
  adminResetPassword,
  markVideoEncoded,
  generateCaptions,
} = require("../controllers/adminController");

const {
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
} = require("../controllers/couponController");

const { getDashboardStats } = require("../controllers/analyticsController");
const { getCourseAnalytics } = require("../controllers/progressController");

const router = express.Router();

router.post("/Signup", async (req, res) => {
  const admin = z.object({
    email: z
      .string()
      .min(8, "email must be at least 8 characters long")
      .max(32, "email must not exceed 32 characters")
      .email("email doesn't exist"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(32, "Password must not exceed 32 characters")
      .regex(
        /^(?=.*[a-z])/,
        "Password must contain at least one lowercase letter"
      )
      .regex(
        /^(?=.*[A-Z])/,
        "Password must contain at least one uppercase letter"
      )
      .regex(/^(?=.*\d)/, "Password must contain at least one number")
      .regex(
        /^(?=.*[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?])/,
        "Password must contain at least one special character"
      ),
    fullName: z.string().min(1, "Name is required"),
  });
  try {
    const adminconfirm = admin.safeParse(req.body);
    const { email, password, fullName } = req.body;
    if (!adminconfirm.success) {
      return res.status(400).json({
        error: "There was a fault in parsing!",
      });
    }
    const findAdmin = await Admin.findOne({ email });
    if (findAdmin) {
      return res.status(401).json({
        error: "You already have an account :)",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 5);
    const adminschema = await Admin.create({
      email: email,
      password: hashedPassword,
      fullName: fullName,
    });
    return res.status(200).json({
      message: "Admin's account created successfully",
      account: {
        email: adminschema.email,
        adminname: adminschema.fullName,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: "internal server error",
    });
  }
});

router.post("/Login", loginAdmin);

// Admin Forgot Password (OTP)
router.post("/forgot-password/send-otp", adminSendPasswordResetOTP);
router.post("/forgot-password/verify-otp", adminVerifyPasswordResetOTP);
router.put("/forgot-password/reset", adminResetPassword);

router.post(
  "/courses",
  adminAuthMiddleware,
  upload.single("thumbnail"),
  createCourse
);

router.post(
  "/courses/:courseId/videos/generate-upload-url",
  adminAuthMiddleware,
  generateVideoUploadUrl
);

router.delete("/DeleteAccount", deleteAdminAccount);

router.put("/courses/:courseId", adminAuthMiddleware, updateCourse);

router.delete("/courses/:id", adminAuthMiddleware, deleteCourse);

// Admin Profile Management
const updateAdminProfileSchema = z.object({
  fullName: z.string().min(1).optional(),
  headline: z.string().min(1).optional(),
  bio: z.string().min(1).optional(),
  description: z.string().max(500).optional(),
  country: z.string().min(1).optional(),
  profession: z.string().min(1).optional(),
  socialLinks: z
    .object({
      linkedin: z.string().url().optional(),
      twitter: z.string().url().optional(),
      github: z.string().url().optional(),
      website: z.string().url().optional(),
    })
    .optional(),
  expertise: z.array(z.string()).optional(),
});

router.get("/profile", adminAuthMiddleware, getAdminProfile);
router.patch("/profile", adminAuthMiddleware, async (req, res) => {
  try {
    const result = updateAdminProfileSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "There was a fault in parsing!",
      });
    }
    return updateAdminProfile(req, res);
  } catch (err) {
    return res.status(500).json({
      error: "internal server error",
    });
  }
});
router.put(
  "/profile/photo",
  adminAuthMiddleware,
  upload.single("file"),
  updateAdminProfilePhoto
);

// Public route to get all instructors
router.get("/instructors", getAllAdminsAsInstructors);

// Admin Google OAuth route
router.post("/google-auth", adminGoogleAuth);

// Coupon Management Routes
router.post("/coupons", adminAuthMiddleware, createCoupon);
router.get("/coupons", adminAuthMiddleware, getAllCoupons);
router.put("/coupons/:couponId", adminAuthMiddleware, updateCoupon);
router.delete("/coupons/:couponId", adminAuthMiddleware, deleteCoupon);

// Analytics Routes
router.get("/dashboard-stats", adminAuthMiddleware, getDashboardStats);
router.get(
  "/courses/:courseId/analytics",
  adminAuthMiddleware,
  getCourseAnalytics
);

// Course Management Routes
router.get("/courses", adminAuthMiddleware, getAllCourses);
router.get("/courses/:courseId", adminAuthMiddleware, getCourseById);

// Enhanced course update route
const storage = multer.memoryStorage();
const uploadThumbnail = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});
router.put(
  "/courses/:courseId/info",
  adminAuthMiddleware,
  upload.single("thumbnail"),
  updateCourseInfo
);

// Note: Thumbnail upload is handled within the course info update

// --- Video Management Routes ---
router.post(
  "/courses/:courseId/videos/upload-session",
  adminAuthMiddleware,
  createVideoUploadSession
);

// Mark video upload as complete
router.post(
  "/courses/:courseId/videos/:videoId/complete",
  adminAuthMiddleware,
  markVideoUploadComplete
);

// Delete a specific video from course
router.delete(
  "/courses/:courseId/videos/:assetId",
  adminAuthMiddleware,
  deleteVideo
);

// Update video metadata (title, order)
router.put(
  "/courses/:courseId/videos/:assetId",
  adminAuthMiddleware,
  updateVideo
);

// Encoder callback (no auth middleware; secret header is enforced in controller)
router.post("/courses/:courseId/videos/:videoId/encoded", markVideoEncoded);

router.post("/videos/:videoId/encoded", markVideoEncoded);

// Caption Generation Route
console.log(
  "[ADMIN_ROUTES] Registering caption route: POST /courses/:courseId/videos/:assetId/captions"
);
router.post(
  "/courses/:courseId/videos/:assetId/captions",
  (req, res, next) => {
    console.log("[CAPTION_ROUTE] Route hit with params:", req.params);
    next();
  },
  adminAuthMiddleware,
  generateCaptions
);

module.exports = router;
