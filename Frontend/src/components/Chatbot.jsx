import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Chatbot = ({ video, transcriptData }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      content:
        "Hi! I'm Sahayak, your AI study assistant. Ask me anything — about this video, the subject, or any question at all!",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Gemini doesn’t support HEIC/HEIF (iPhone default format)
    if (
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif")
    ) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "bot",
          content:
            "⚠️ HEIC/HEIF images (iPhone format) aren’t supported. Please convert to JPEG or PNG first \u2014 on iPhone: tap the photo → Share → Save as JPEG, or just take a screenshot!",
          timestamp: new Date(),
        },
      ]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.type.startsWith("image/")) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const generateResponse = async (userMessage, imageFile = null) => {
    setIsTyping(true);
    try {
      const token = localStorage.getItem("token");

      if (imageFile) {
        const formData = new FormData();
        formData.append("message", userMessage);
        formData.append(
          "videoContext",
          JSON.stringify({
            title: video?.title,
            description: video?.description,
          }),
        );
        formData.append("transcriptData", JSON.stringify(transcriptData));
        formData.append(
          "conversationHistory",
          JSON.stringify(
            messages
              .slice(-10)
              .map((m) => ({ type: m.type, content: m.content })),
          ),
        );
        formData.append("image", imageFile);
        const res = await fetch("/api/chatbot/chat", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          setIsTyping(false);
          return data.response;
        }
      } else {
        const res = await fetch("/api/chatbot/chat", {
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
            transcriptData,
            conversationHistory: messages
              .slice(-10)
              .map((m) => ({ type: m.type, content: m.content })),
          }),
        });
        const data = await res.json();
        if (data.success) {
          setIsTyping(false);
          return data.response;
        }
      }
      throw new Error("Failed");
    } catch (err) {
      console.error("Gemini error:", err);
      setIsTyping(false);
      return imageFile
        ? "I can see you've uploaded an image! I'm having trouble processing it right now. Could you describe it or ask about the video?"
        : "I'm here to help! Could you rephrase your question?";
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedImage) return;
    const content = inputMessage.trim() || "📷 Image uploaded";

    const userMsg = {
      id: Date.now(),
      type: "user",
      content,
      image: imagePreview,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");

    const botResponse = await generateResponse(content, selectedImage);
    clearImage();

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        type: "bot",
        content: botResponse,
        timestamp: new Date(),
      },
    ]);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const fmt = (d) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const quickQuestions = [
    "What is this video about?",
    "Summarise the key points",
    "Explain the main concept",
    "What is 2 + 2?",
  ];

  return (
    <div className="h-full flex flex-col bg-[#0c0e14]">
      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-end gap-2.5 ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              {/* Bot avatar */}
              {msg.type === "bot" && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 mb-0.5">
                  <span className="text-[10px] font-bold text-black">AI</span>
                </div>
              )}

              <div
                className={`max-w-[78%] flex flex-col ${msg.type === "user" ? "items-end" : "items-start"}`}
              >
                {/* Image (if any) */}
                {msg.image && (
                  <img
                    src={msg.image}
                    alt="uploaded"
                    className="max-h-28 rounded-xl mb-1.5 border border-[#222530]"
                  />
                )}

                {/* Bubble */}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                    msg.type === "user"
                      ? "bg-cyan-500 text-black font-medium rounded-br-sm"
                      : "bg-[#111318] border border-[#222530] text-gray-200 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>

                {/* Timestamp */}
                <span className="text-[10px] text-gray-700 mt-1 px-1">
                  {fmt(msg.timestamp)}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end gap-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-black">AI</span>
            </div>
            <div className="bg-[#111318] border border-[#222530] px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick questions (only on first message) ── */}
      {messages.length === 1 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2 flex-shrink-0">
          {quickQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => {
                setInputMessage(q);
                inputRef.current?.focus();
              }}
              className="text-xs bg-[#111318] border border-[#222530] hover:border-cyan-500/40 hover:text-cyan-400 text-gray-500 px-3 py-1.5 rounded-full transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* ── Image preview ── */}
      {imagePreview && (
        <div className="px-4 pb-2 flex-shrink-0">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-16 w-16 object-cover rounded-xl border border-[#222530]"
            />
            <button
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-400 text-white rounded-full text-xs flex items-center justify-center leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="px-4 py-3 border-t border-[#222530] flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Image button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#111318] border border-[#222530] text-gray-500 hover:text-gray-300 hover:border-[#3a3d4a] transition-colors flex-shrink-0 text-base"
          >
            📷
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask anything…"
            disabled={isTyping}
            className="flex-1 px-3.5 py-2 bg-[#111318] border border-[#222530] focus:border-cyan-500/60 text-white text-sm rounded-xl outline-none placeholder-gray-700 transition-colors disabled:opacity-50"
          />

          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={(!inputMessage.trim() && !selectedImage) || isTyping}
            className="w-9 h-9 flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black rounded-xl transition-colors flex-shrink-0"
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
