const express = require("express");
const {
  chatWithAI,
  testConnection,
  upload,
} = require("../controllers/chatbotController");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Chat with AI (with image upload support)
router.post("/chat", authMiddleware, upload.single("image"), chatWithAI);

// Test Gemini connection
router.get("/test", authMiddleware, testConnection);

module.exports = router;
