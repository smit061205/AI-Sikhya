const express = require("express");
require("dotenv").config();
const cors = require("cors");
const mongoose = require("mongoose");
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const courseRoutes = require("./routes/course");
const paymentRoutes = require("./routes/payment");
const notificationRoutes = require("./routes/notification");
const contactRoutes = require("./routes/contact");
const chatbotRoutes = require("./routes/chatbotRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();
const MONGO_URL = process.env.MONGO_URL;

// MongoDB connection with proper error handling and timeouts
mongoose
  .connect(MONGO_URL, {
    serverSelectionTimeoutMS: 30000, // 30 second timeout for initial connection
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  })
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas successfully");
    console.log("📊 Database:", mongoose.connection.db.databaseName);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    console.error(
      "Connection string check: MONGO_URL is",
      MONGO_URL ? "set" : "missing",
    );
    process.exit(1); // Exit if cannot connect to database
  });

// Handle connection events for monitoring
mongoose.connection.on("disconnected", () => {
  console.log("⚠️  MongoDB disconnected - attempting to reconnect...");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err.message);
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected successfully");
});
app.use(express.json());

// Set up CORS to allow requests from your Vercel frontend
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://ai-sikhya.vercel.app",
    "https://ai-sikhya-qzx71virt-smit061205-gmailcoms-projects.vercel.app",
  ],
  optionsSuccessStatus: 200, // For legacy browser support
};
app.use(cors(corsOptions));

app.use("/user", userRoutes);
app.use("/admin", adminRoutes);
app.use("/", courseRoutes);
app.use("/payment", paymentRoutes);
app.use("/notifications", notificationRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/chatbot", chatbotRoutes);

// Health check endpoint for UptimeRobot
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use(notFound);
app.use(errorHandler);

app.listen(3000);
