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
mongoose.connect(MONGO_URL);
app.use(express.json());

// Set up CORS to allow requests from your Vercel frontend
const corsOptions = {
  origin: [
    "http://localhost:5173",
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

app.use(notFound);
app.use(errorHandler);

app.listen(3000);
