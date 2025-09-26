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
app.use(cors());

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
