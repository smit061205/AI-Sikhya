const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientModel',
  },
  recipientModel: {
    type: String,
    required: true,
    enum: ['User', 'Admin'],
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderModel',
  },
  senderModel: {
    type: String,
    enum: ['User', 'Admin'],
  },
  type: {
    type: String,
    required: true,
    enum: [
      'course_purchase',      // When someone buys admin's course
      'new_review',          // When someone reviews admin's course
      'question_asked',      // When someone asks a question in admin's course
      'question_answered',   // When admin/student answers user's question
      'course_completed',    // When user completes a course
      'new_course_content',  // When admin adds new content to purchased course
      'welcome',            // Welcome notification for new users
      'system',             // System-wide announcements
    ],
  },
  title: {
    type: String,
    required: true,
    maxlength: 100,
  },
  message: {
    type: String,
    required: true,
    maxlength: 500,
  },
  relatedCourse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
  },
  relatedQuestion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  },
  actionUrl: {
    type: String, // URL to navigate to when notification is clicked
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
});

// Index for efficient querying
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

// Method to mark notification as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

module.exports = {
  Notification,
};
