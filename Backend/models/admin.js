const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: String,
  fullName: String,
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
  },
  profilePicture: {
    type: String, // URL from Google
  },
  profilePhoto: {
    url: String,
    public_id: String,
  },
  resetPasswordOtp: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  headline: {
    type: String,
    maxlength: 100,
  },
  bio: String,
  country: {
    type: String,
  },
  profession: {
    type: String,
  },
  socialLinks: {
    website: String,
    twitter: String,
    linkedin: String,
    github: String,
  },
  expertise: [String],
});

const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);

module.exports = { Admin };
