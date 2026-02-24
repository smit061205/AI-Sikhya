const mongoose = require("mongoose");

const videoProgressSchema = new mongoose.Schema({
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  watchTime: {
    type: Number, // in seconds
    default: 0,
  },
  completedAt: {
    type: Date,
  },
});

const progressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  videosProgress: [videoProgressSchema],
  overallProgress: {
    type: Number, // percentage (0-100)
    default: 0,
    min: 0,
    max: 100,
  },
  completionNotified: {
    type: Boolean,
    default: false,
  },
  completedVideos: {
    type: Number,
    default: 0,
  },
  totalVideos: {
    type: Number,
    default: 0,
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now,
  },
  courseStartedAt: {
    type: Date,
    default: Date.now,
  },
  courseCompletedAt: {
    type: Date,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
});

// Create a compound index to ensure one progress record per user per course
progressSchema.index({ user: 1, course: 1 }, { unique: true });

// Method to calculate overall progress
progressSchema.methods.calculateProgress = function() {
  if (this.totalVideos === 0) {
    this.overallProgress = 0;
    return;
  }
  
  this.completedVideos = this.videosProgress.filter(video => video.isCompleted).length;
  this.overallProgress = Math.round((this.completedVideos / this.totalVideos) * 100);
  
  // Mark course as completed if all videos are watched
  if (this.completedVideos === this.totalVideos && !this.isCompleted) {
    this.isCompleted = true;
    this.courseCompletedAt = new Date();
  }
};

// Update lastAccessedAt before saving
progressSchema.pre('save', function(next) {
  this.lastAccessedAt = new Date();
  this.calculateProgress();
  next();
});

const Progress = mongoose.models.Progress || mongoose.model("Progress", progressSchema);

module.exports = {
  Progress,
};
