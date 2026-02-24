const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { upload } = require("../utils/cloudinary");
const {
  createQuestion,
  getCourseQuestions,
  addAnswer,
  markQuestionResolved,
  deleteQuestion,
} = require("../controllers/questionController");
const {
  initializeCourseProgress,
  updateVideoProgress,
  getCourseProgress,
  getUserProgress,
} = require("../controllers/progressController");
const {
  signupUser,
  loginUser,
  deleteUserAccount,
  toggleBookmark,
  getCart,
  addToCart,
  removeFromCart,
  addReview,
  applyCoupon,
  getUserProfile,
  updateUserProfile,
  updateUserProfilePhoto,
  googleAuth,
  changePassword,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword,
} = require("../controllers/userController");

// Authentication routes
router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/google-auth", googleAuth);
router.delete("/DeleteAccount", deleteUserAccount);

router.post("/courses/:courseId/bookmark", authMiddleware, toggleBookmark);

router.get("/cart", authMiddleware, getCart);
router.post("/cart/:courseId", authMiddleware, addToCart);
router.delete("/cart/:courseId", authMiddleware, removeFromCart);

// Route for adding a review to a course
router.post("/courses/:courseId/reviews", authMiddleware, addReview);

// Route for applying a coupon to the cart
router.post("/cart/apply-coupon", authMiddleware, applyCoupon);

// User Profile Management
router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateUserProfile);
router.put(
  "/profile-photo",
  authMiddleware,
  upload.single("profilePhoto"),
  updateUserProfilePhoto
);

// Password Management
router.put("/change-password", authMiddleware, changePassword);
router.post("/forgot-password/send-otp", sendPasswordResetOTP);
router.post("/forgot-password/verify-otp", verifyPasswordResetOTP);
router.put("/forgot-password/reset", resetPassword);

// Q&A Management
router.post("/courses/:courseId/questions", authMiddleware, createQuestion);
router.get("/courses/:courseId/questions", getCourseQuestions);
router.post("/questions/:questionId/answers", authMiddleware, addAnswer);
router.put(
  "/questions/:questionId/resolve",
  authMiddleware,
  markQuestionResolved
);
router.delete("/questions/:questionId", authMiddleware, deleteQuestion);

// Progress Tracking
router.post(
  "/courses/:courseId/progress/initialize",
  authMiddleware,
  initializeCourseProgress
);
router.put(
  "/courses/:courseId/videos/:videoId/progress",
  authMiddleware,
  updateVideoProgress
);
router.get("/courses/:courseId/progress", authMiddleware, getCourseProgress);
router.get("/progress", authMiddleware, getUserProgress);

module.exports = router;
