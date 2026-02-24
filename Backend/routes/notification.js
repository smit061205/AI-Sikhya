const express = require("express");
const authMiddleware = require("../middleware/auth");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notificationController");

const router = express.Router();

// All routes in this file are protected and require authentication
router.use(authMiddleware);

// Get all notifications for the logged-in user or admin
router.get("/", getNotifications);

// Mark a single notification as read
router.put("/:notificationId/read", markAsRead);

// Mark all notifications as read
router.put("/read-all", markAllAsRead);

// Delete a single notification
router.delete("/:notificationId", deleteNotification);

module.exports = router;
