const mongoose = require("mongoose");
const { string, lowercase } = require("zod");

const userSchemna = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: String,
  username: String,
});

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: String,
  name: String,
  uploads: [
    {
      url: string,
      size: Number,
      uploadedAT: {
        type: Date,
        default: Date.now(),
      },
    },
  ],
  totaluploadsize: {
    type: Number,
    default: 0,
  },
});

const courseSchema = new mongoose.Schema({
  title: String,
  url: String,
  description: String,
  price: Number,
  media: [
    {
      url: String,
      type: String,
      uploadedAt: { type: Date, default: Date.now() },
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
  },
  purchasedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const User = mongoose.models.User || mongoose.model("User", userSchemna);
const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
const Course = mongoose.models.Course || mongoose.model("Course", courseSchema);
module.exports = {
  User,
  Admin,
  Course,
};
