const mongoose = require("mongoose");

// Explicitly define the schema for the subdocument
const mediaSchema = new mongoose.Schema({
  url: String,
  type: String, // "video" or "image"
  uploadedAt: { type: Date, default: Date.now },
});

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    assetId: {
      // A unique ID we generate before upload
      type: String,
      required: true,
      unique: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: ["uploading", "processing", "completed", "failed"],
      default: "uploading",
    },
    captionStatus: {
      type: String,
      enum: ["not-generated", "processing", "completed", "failed"],
      default: "not-generated",
    },
    captionTrackUrl: {
      type: String, // Public URL to the en.vtt file
    },
    playbackUrl: {
      // The final signed HLS URL for the player
      type: String,
    },
    duration: {
      type: Number, // in seconds
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    thumbnail: {
      public_id: String,
      url: String,
    },
    category: String,
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    tags: [String],
    duration: String,
    price: {
      type: Number,
      default: 0,
    },
    originalPrice: {
      type: Number,
    },
    videos: [mediaSchema],
    notes: [mediaSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    purchasedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    reviews: [reviewSchema],
    averageRating: {
      type: Number,
      default: 0,
    },
    videoLectures: [videoSchema],
  },
  { timestamps: true }
);

// Add a text index for searching
courseSchema.index({ title: "text", description: "text", tags: "text" });

const Course = mongoose.models.Course || mongoose.model("Course", courseSchema);

module.exports = { Course };
