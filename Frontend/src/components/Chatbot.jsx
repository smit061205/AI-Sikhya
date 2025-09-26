import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Chatbot = ({ video, transcriptData }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      content:
        "Hi! I'm Sahayak, your AI study assistant. Ask me anything about this video or the subject matter!",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  // Handle image file selection
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear selected image
  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // AI-powered response generation using Gemini API
  // AI-powered response generation using Gemini API
  const generateResponse = async (userMessage, imageFile = null) => {
    setIsTyping(true);

    try {
      const token = localStorage.getItem("token");

      // Create FormData for multipart request when image is present
      if (imageFile) {
        const formData = new FormData();
        formData.append("message", userMessage);
        formData.append(
          "videoContext",
          JSON.stringify({
            title: video?.title,
            description: video?.description,
          })
        );
        formData.append("transcriptData", JSON.stringify(transcriptData));
        formData.append(
          "conversationHistory",
          JSON.stringify(
            messages.slice(-10).map((msg) => ({
              type: msg.type,
              content: msg.content,
            }))
          )
        );
        formData.append("image", imageFile);

        const response = await fetch("/api/chatbot/chat", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // Don't set Content-Type for FormData
          },
          body: formData,
        });

        const data = await response.json();
        if (data.success) {
          setIsTyping(false);
          return data.response;
        }
      } else {
        // Regular text-only request
        const response = await fetch("/api/chatbot/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: userMessage,
            videoContext: {
              title: video?.title,
              description: video?.description,
            },
            transcriptData: transcriptData,
            conversationHistory: messages.slice(-10).map((msg) => ({
              type: msg.type,
              content: msg.content,
            })),
          }),
        });

        const data = await response.json();
        if (data.success) {
          setIsTyping(false);
          return data.response;
        }
      }

      throw new Error("Failed to get AI response");
    } catch (error) {
      console.error("Gemini API Error:", error);
      setIsTyping(false);

      // Fallback responses
      if (imageFile) {
        return "I can see you've uploaded an image! While I'm having trouble processing it right now, I'm here to help you understand the video content better. Could you describe what's in the image or ask me about the video?";
      }
      return "I'm here to help you understand the video content better. Could you provide more details about what you'd like to learn?";
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedImage) return;

    const messageContent = inputMessage.trim() || "📷 Image uploaded";

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: messageContent,
      image: imagePreview, // Store preview for display
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");

    const botResponse = await generateResponse(messageContent, selectedImage);

    // Clear image after sending
    clearImage();

    const botMessage = {
      id: Date.now() + 1,
      type: "bot",
      content: botResponse,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, botMessage]);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const quickQuestions = [
    "What is this video about?",
    "Can you summarize the main points?",
    "How can I use the transcript?",
    "Help me understand this topic",
  ];

  const handleQuickQuestion = (question) => {
    setInputMessage(question);
    inputRef.current?.focus();
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold">AI</span>
          </div>
          <div>
            <h3 className="font-semibold">Sahayak Study Assistant</h3>
          </div>
        </div>
      </div>

      {/* Messages */}

      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight: "calc(100vh - 200px)" }}
      >
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] ${
                  message.type === "user" ? "order-2" : "order-1"
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-lg ${
                    message.type === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-100"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">
                    {message.content}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-1 px-2">
                  {formatTime(message.timestamp)}
                </p>
              </div>
              {message.type === "bot" && (
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2 mt-1 order-1">
                  <span className="text-xs font-bold">AI</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2 mt-1">
              <span className="text-xs font-bold">AI</span>
            </div>
            <div className="bg-gray-800 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {messages.length === 1 && (
        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 mb-2">Quick questions:</p>
          <div className="space-y-2">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleQuickQuestion(question)}
                className="w-full text-left text-sm bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Image Preview */}
      {imagePreview && (
        <div className="p-4 border-t border-gray-700 flex-shrink-0">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-20 max-w-20 object-cover rounded-lg"
            />
            <button
              onClick={clearImage}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Image ready to send</p>
        </div>
      )}
      {/* Input */}
      {/* Input */}
      <div className="p-4 border-t border-gray-700 flex-shrink-0">
        <div className="flex space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            title="Upload Image"
          >
            📷
          </button>
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Sahayak a question..."
            className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-blue-500 outline-none text-sm"
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={(!inputMessage.trim() && !selectedImage) || isTyping}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
