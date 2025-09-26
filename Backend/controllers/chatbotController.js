const geminiService = require("../utils/geminiService");
const multer = require("multer");

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Handle chat message and generate AI response
const chatWithAI = async (req, res) => {
  try {
    const { message, videoContext, transcriptData, conversationHistory } =
      req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    // Parse JSON strings back to objects
    const parsedVideoContext =
      typeof videoContext === "string"
        ? JSON.parse(videoContext)
        : videoContext;
    const parsedTranscriptData =
      typeof transcriptData === "string"
        ? JSON.parse(transcriptData)
        : transcriptData;
    const parsedConversationHistory =
      typeof conversationHistory === "string"
        ? JSON.parse(conversationHistory)
        : conversationHistory;

    // Prepare context for Gemini
    const context = {
      video: parsedVideoContext || null,
      transcript: parsedTranscriptData || [],
      history: parsedConversationHistory || [],
    };

    // Add image data if file was uploaded
    if (req.file) {
      context.imageData = req.file;
      console.log(
        "🖼️ Image uploaded:",
        req.file.originalname,
        req.file.mimetype
      );
    }

    console.log(
      "🤖 Generating AI response for:",
      message.substring(0, 50) + "...",
      req.file ? "with image" : "text only"
    );

    // Generate response using Gemini
    const aiResponse = await geminiService.generateResponse(message, context);

    res.json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chatbot Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate AI response",
      message: error.message,
    });
  }
};

// Test Gemini API connection
const testConnection = async (req, res) => {
  try {
    const result = await geminiService.testConnection();

    res.json({
      success: result.success,
      message: result.message,
      testResponse: result.testResponse || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Gemini Test Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to test Gemini connection",
      message: error.message,
    });
  }
};

module.exports = {
  chatWithAI,
  testConnection,
  upload, // Export upload middleware
};
