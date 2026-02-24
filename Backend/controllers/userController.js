const { z } = require("zod");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models/user");
const { createNotification } = require("../utils/notificationHelper");
const { Course } = require("../models/course");
const { Coupon } = require("../models/coupon");
const cloudinary = require("cloudinary").v2;
const JWT_SECRET = process.env.JWT_SECRET;
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const sendEmail = require("../utils/sendEmail");

const signupUser = async (req, res) => {
  const user = z.object({
    email: z.string().min(8).max(32).email("email doesn't exist"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(32, "Password must not exceed 32 characters")
      .regex(/^(?=.*[a-z])/, "Must include lowercase")
      .regex(/^(?=.*[A-Z])/, "Must include uppercase")
      .regex(/^(?=.*\d)/, "Must include a number")
      .regex(
        /^(?=.*[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?])/,
        "Must include special char"
      ),
    name: z.string().min(1, "Name is required"),
  });

  const userconfirm = user.safeParse(req.body);
  if (!userconfirm.success) {
    return res.status(400).json({ error: userconfirm.error.issues[0].message });
  }

  const { email, password, name } = userconfirm.data;

  try {
    const hashedpassword = await bcrypt.hash(password, 5);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(403).json({
        error: `User already exists with email id of: ${email} and username of: ${name}`,
      });
    }

    const newUser = await User.create({
      email,
      password: hashedpassword,
      username: name,
    });

    // Send welcome notification
    await createNotification({
      recipient: newUser._id,
      recipientModel: "User",
      type: "welcome",
      title: "Welcome to the Platform!",
      message:
        "We are excited to have you here. Start exploring our courses and find your next learning adventure.",
      actionUrl: "/dashboard",
      priority: "high",
    });

    return res.status(200).json({ success: "User successfully created!" });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

const loginUser = async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0].message });
  }

  const { email, password } = validation.data;

  try {
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(403).json({ error: "user doesn't exist" });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!isPasswordValid) {
      return res.status(404).json({ error: "password doesn't match" });
    }

    const token = jwt.sign({ id: existingUser.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    // Add unified profile image URL
    const profileImageUrl =
      existingUser.profilePicture || existingUser.profilePhoto?.url || null;

    return res.status(200).json({
      message: "Success signing in!",
      email: existingUser.email,
      token,
      username: existingUser.username,
      profileImageUrl,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

const deleteUserAccount = async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0].message });
  }

  const { email, password } = validation.data;

  try {
    const findAccount = await User.findOne({ email });
    if (!findAccount) {
      res.status(404).json({
        error: "user can't be found.",
      });
      return;
    }
    const confirmPassword = await bcrypt.compare(
      password,
      findAccount.password
    );
    if (!confirmPassword) {
      res.status(403).json({
        error: "Password doen't match :(",
      });
      return;
    }
    await User.deleteOne({ email });
    return res.status(200).json({
      message: `Successfully deleted the account with the email : ${email}`,
    });
  } catch (err) {
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

const toggleBookmark = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId; // Assumes authMiddleware provides this

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }

    const bookmarkIndex = user.bookmarkedCourses.indexOf(courseId);
    let message;

    if (bookmarkIndex === -1) {
      // If not bookmarked, add it
      user.bookmarkedCourses.push(courseId);
      message = "Course bookmarked successfully.";
    } else {
      // If already bookmarked, remove it
      user.bookmarkedCourses.splice(bookmarkIndex, 1);
      message = "Bookmark removed successfully.";
    }

    await user.save();
    res.status(200).json({
      message,
      bookmarkedCourses: user.bookmarkedCourses,
    });
  } catch (err) {
    console.error("--- ERROR in toggleBookmark ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getCart = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).populate({
      path: "cart",
      populate: { path: "createdBy", select: "name email" },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json({ cart: user.cart });
  } catch (err) {
    console.error("--- ERROR in getCart ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const addToCart = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }

    if (user.cart.includes(courseId)) {
      return res.status(400).json({ message: "Course already in cart." });
    }

    if (user.purchasedCourses.includes(courseId)) {
      return res
        .status(400)
        .json({ message: "You have already purchased this course." });
    }

    user.cart.push(courseId);
    await user.save();

    res.status(200).json({
      message: "Course added to cart successfully.",
      cart: user.cart,
    });
  } catch (err) {
    console.error("--- ERROR in addToCart ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const courseIndex = user.cart.indexOf(courseId);
    if (courseIndex === -1) {
      return res.status(404).json({ message: "Course not found in cart." });
    }

    user.cart.splice(courseIndex, 1);
    await user.save();

    res.status(200).json({
      message: "Course removed from cart successfully.",
      cart: user.cart,
    });
  } catch (err) {
    console.error("--- ERROR in removeFromCart ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const addReview = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId;
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      return res
        .status(400)
        .json({ error: "Rating and comment are required." });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }

    const user = await User.findById(userId);
    // Check if user has purchased the course
    if (!user.purchasedCourses.includes(courseId)) {
      return res
        .status(403)
        .json({ error: "You must purchase the course to leave a review." });
    }

    // Check if user has already reviewed the course
    const existingReview = course.reviews.find(
      (review) => review.user.toString() === userId
    );

    if (existingReview) {
      return res
        .status(400)
        .json({ error: "You have already reviewed this course." });
    }

    // Add the new review
    const review = {
      user: userId,
      rating: Number(rating),
      comment,
    };
    course.reviews.push(review);

    // Update the average rating
    const totalRating = course.reviews.reduce(
      (acc, item) => item.rating + acc,
      0
    );
    course.averageRating = totalRating / course.reviews.length;

    await course.save();

    // Notify the course instructor about the new review
    await createNotification({
      recipient: course.createdBy,
      recipientModel: "Admin",
      sender: userId,
      senderModel: "User",
      type: "new_review",
      title: `You have a new review for ${course.title}`,
      message: `${user.username} left a ${rating}-star review: "${comment}"`,
      relatedCourse: courseId,
      actionUrl: `/admin/courses/${courseId}/reviews`,
      priority: "medium",
    });

    res.status(201).json({ message: "Review added successfully.", course });
  } catch (err) {
    console.error("--- ERROR in addReview ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const userId = req.userId;

    if (!couponCode) {
      return res.status(400).json({ error: "Coupon code is required." });
    }

    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true,
    });

    if (!coupon || coupon.expiryDate < new Date()) {
      return res
        .status(404)
        .json({ error: "Invalid, inactive, or expired coupon code." });
    }

    const user = await User.findById(userId).populate("cart");
    if (!user || user.cart.length === 0) {
      return res.status(400).json({ error: "Your cart is empty." });
    }

    const originalTotal = user.cart.reduce(
      (acc, course) => acc + course.price,
      0
    );

    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = (originalTotal * coupon.discountValue) / 100;
    } else if (coupon.discountType === "fixed") {
      discountAmount = coupon.discountValue;
    }

    const finalTotal = Math.max(0, originalTotal - discountAmount);

    res.status(200).json({
      message: "Coupon applied successfully!",
      originalTotal: originalTotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      finalTotal: finalTotal.toFixed(2),
      couponCode: coupon.code,
    });
  } catch (err) {
    console.error("--- ERROR in applyCoupon ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Add unified profile image URL
    const userResponse = user.toObject();
    userResponse.profileImageUrl =
      user.profilePicture || user.profilePhoto?.url || null;

    console.log("📸 Profile Image Debug:", {
      userId: user._id,
      profilePicture: user.profilePicture,
      profilePhotoUrl: user.profilePhoto?.url,
      unifiedUrl: userResponse.profileImageUrl,
    });

    res.status(200).json(userResponse);
  } catch (err) {
    console.error("--- ERROR in getUserProfile ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const {
      username,
      country,
      profession,
      dateOfBirth,
      headline,
      socialLinks,
      gender,
    } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      {
        username,
        country,
        profession,
        dateOfBirth,
        headline,
        socialLinks,
        gender,
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    res
      .status(200)
      .json({ message: "Profile updated successfully", user: updatedUser });
  } catch (err) {
    console.error("--- ERROR in updateUserProfile ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateUserProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // If there's an old photo, delete it from Cloudinary
    if (user.profilePhoto && user.profilePhoto.public_id) {
      await cloudinary.uploader.destroy(user.profilePhoto.public_id);
    }

    // Update with the new photo
    user.profilePhoto = {
      url: req.file.path,
      public_id: req.file.filename,
    };

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      message: "Profile photo updated successfully",
      user: userResponse,
    });
  } catch (err) {
    console.error("--- ERROR in updateUserProfilePhoto ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const googleAuth = async (req, res) => {
  const schema = z.object({
    credential: z.string().min(1, "Google credential is required"),
  });

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0].message });
  }

  const { credential } = validation.data;

  try {
    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // Check if user exists
    let existingUser = await User.findOne({ email });

    if (existingUser) {
      // Update Google ID if not set
      if (!existingUser.googleId) {
        existingUser.googleId = googleId;
        existingUser.profilePicture = picture;
        await existingUser.save();
      }
    } else {
      // Create new user
      existingUser = await User.create({
        email,
        username: name,
        googleId,
        profilePicture: picture,
        password: null, // No password for Google users
      });

      // Send welcome notification
      await createNotification({
        recipient: existingUser._id,
        recipientModel: "User",
        type: "welcome",
        title: "Welcome to the Platform!",
        message:
          "We are excited to have you here. Start exploring our courses and find your next learning adventure.",
        actionUrl: "/dashboard",
        priority: "high",
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: existingUser._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    // Add unified profile image URL
    const profileImageUrl =
      existingUser.profilePicture || existingUser.profilePhoto?.url || null;

    return res.status(200).json({
      message: "Google authentication successful!",
      email: existingUser.email,
      token,
      username: existingUser.username,
      profilePicture: existingUser.profilePicture, // Keep for backward compatibility
      profileImageUrl, // New unified field
    });
  } catch (err) {
    console.error("Google auth error:", err);
    return res.status(500).json({ error: "Google authentication failed" });
  }
};

const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!oldPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Old and new passwords are required." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(403).json({ error: "Invalid old password." });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    res.status(500).json({ error: "Internal server error." });
  }
};

const sendPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Ensure OTP is a string
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = otpExpires;
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset OTP",
        text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\nYour OTP is: ${otp}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`,
      });

      res.status(200).json({ message: "OTP sent to your email." });
    } catch (err) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res
        .status(500)
        .json({ error: "Error sending email. Please try again later." });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error." });
  }
};

const verifyPasswordResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (
      user.resetPasswordOtp !== otp ||
      user.resetPasswordExpires < new Date()
    ) {
      return res.status(403).json({ error: "Invalid or expired OTP." });
    }

    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "OTP verified successfully." });
  } catch (error) {
    res.status(500).json({ error: "Internal server error." });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ error: "Invalid OTP or email, or OTP has expired." });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password has been reset successfully." });
  } catch (error) {
    res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = {
  signupUser,
  loginUser,
  deleteUserAccount,
  toggleBookmark,
  getCart,
  addToCart,
  removeFromCart,
  addReview,
  applyCoupon,
  getUserProfile,
  updateUserProfile,
  updateUserProfilePhoto,
  googleAuth,
  changePassword,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword,
};
