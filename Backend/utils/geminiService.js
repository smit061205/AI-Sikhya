const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️ GEMINI_API_KEY not found in environment variables");
      this.genAI = null;
      return;
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use a widely available model version; allow override via env.
    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-001";
    console.log(`[Gemini] Using model: ${modelName}`);
    this.model = this.genAI.getGenerativeModel({
      model: modelName,
    });

    // Vision model for image processing
    this.visionModel = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-001",
    });

    // System prompt
    this.systemPrompt = `You are Sahayak, a friendly and knowledgeable AI study assistant on an educational video learning platform.

IMPORTANT: You MUST answer ALL questions the student asks — whether about the video, the subject matter, or completely general questions like math ("2+2"), science, coding, grammar, etc. NEVER refuse or redirect a general question back to the video.

Guidelines:
- Answer ALL questions directly and helpfully, regardless of topic
- For video/transcript questions, refer to the provided context
- For general questions (math, science, coding, etc.), answer them correctly and concisely
- Be friendly, encouraging, and clear
- Use examples when helpful`;
  }

  async generateResponse(userMessage, context = {}) {
    if (!this.genAI) {
      // Fallback to basic responses if Gemini is not available
      return this.getFallbackResponse(userMessage);
    }

    try {
      // Build context from video and transcript data
      let contextPrompt = this.systemPrompt;

      if (context.video) {
        contextPrompt += `\n\nVideo Context:\n- Title: ${
          context.video.title || "Educational Video"
        }\n- Description: ${
          context.video.description || "No description available"
        }`;
      }

      if (context.transcript && context.transcript.length > 0) {
        const transcriptText = context.transcript
          .map((item) => item.text)
          .join(" ")
          .substring(0, 2000); // Limit transcript length

        contextPrompt += `\n\nVideo Transcript (partial):\n${transcriptText}`;
      }

      if (context.history && context.history.length > 0) {
        const historyText = context.history
          .map(
            (msg) =>
              `${msg.type === "user" ? "Student" : "Sahayak"}: ${msg.content}`,
          )
          .join("\n")
          .substring(0, 2000);
        contextPrompt += `\n\nConversation History:\n${historyText}`;
      }

      // Handle image processing if image data is provided
      if (context.imageData) {
        return await this.processImageWithText(
          userMessage,
          context.imageData,
          contextPrompt,
        );
      }

      contextPrompt += `\n\nStudent: ${userMessage}\nSahayak:`;

      const result = await this.model.generateContent(contextPrompt);
      const response = await result.response;
      const text = response.text();

      return text;
    } catch (error) {
      console.error("Gemini API Error:", error);
      return this.getFallbackResponse(userMessage);
    }
  }
  async processImageWithText(userMessage, imageData, contextPrompt) {
    try {
      const imagePrompt = `${contextPrompt}

The student has uploaded an image along with their question: "${userMessage}"

Please analyze the image in the context of the educational video content and provide a helpful response. Consider:
- What the image shows and how it relates to the video topic
- Educational explanations about concepts shown in the image
- Connections between the image and the video transcript/content
- Study tips or additional insights based on what you see

Be detailed and educational in your response.`;

      const result = await this.visionModel.generateContent([
        imagePrompt,
        {
          inlineData: {
            data: imageData.buffer.toString("base64"),
            mimeType: imageData.mimetype,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      return text;
    } catch (error) {
      console.error("Gemini Vision API Error:", error);
      return `I can see you've uploaded an image! While I'm having trouble processing it right now, I can help you with questions about the video content. Could you describe what's in the image or ask me about the video topic?`;
    }
  }
  getFallbackResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();

    // Basic pattern matching for fallback responses
    if (lowerMessage.includes("what") && lowerMessage.includes("video")) {
      return "This video covers educational content designed to help you learn. You can use the transcript to review specific sections and find the information you need.";
    } else if (
      lowerMessage.includes("explain") ||
      lowerMessage.includes("what is")
    ) {
      return "I'd be happy to help explain this concept! Based on the video content, the topic is covered with examples and explanations. Could you be more specific about which part you'd like me to clarify?";
    } else if (lowerMessage.includes("help") || lowerMessage.includes("how")) {
      return "I can help you with:\n\n📚 Understanding concepts from the video\n🔍 Finding specific topics in the transcript\n📝 Study tips and explanations\n❓ Answering subject-related questions\n\nWhat would you like to know more about?";
    } else if (
      lowerMessage.includes("summary") ||
      lowerMessage.includes("summarize")
    ) {
      return "I can help summarize the key points from this educational video. The content is structured to build understanding progressively. Would you like me to focus on any particular section?";
    } else if (lowerMessage.includes("thank")) {
      return "You're welcome! I'm here to help you learn. Feel free to ask me anything else about the video content! 😊";
    } else {
      return "That's a great question! I'm here to help you understand the video content better. Could you provide more details about what you'd like to learn?";
    }
  }

  // Test connection to Gemini API
  async testConnection() {
    if (!this.genAI) {
      return { success: false, message: "Gemini API key not configured" };
    }

    try {
      const result = await this.model.generateContent(
        "Hello, this is a test message.",
      );
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        message: "Gemini API connection successful",
        testResponse: text,
      };
    } catch (error) {
      return {
        success: false,
        message: `Gemini API connection failed: ${error.message}`,
      };
    }
  }
}

module.exports = new GeminiService();
