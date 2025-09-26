const { z } = require("zod");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary").v2;
const { OAuth2Client } = require("google-auth-library");
const { PubSub } = require("@google-cloud/pubsub");
const { Admin } = require("../models/admin");
const { Course } = require("../models/course");
const { Video } = require("../models/video");
const authMiddleware = require("../middleware/auth");
const { upload } = require("../utils/cloudinary");
const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const { Storage } = require("@google-cloud/storage");
const { v4: uuidv4 } = require("uuid");
const bucketName = process.env.GCS_SOURCE_BUCKET;
const sendEmail = require("../utils/sendEmail");
const { deleteVideoAssets, deleteCourseAssets } = require("../utils/gcsHelper");
const { spawn } = require("child_process");
const path = require("path");

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEY_FILE_PATH,
});
const sourceBucket = storage.bucket(process.env.GCS_SOURCE_BUCKET);

const pubsub = new PubSub({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEY_FILE_PATH,
});

async function loginAdmin(req, res) {
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });
  const parsedLogin = loginSchema.safeParse(req.body);
  if (!parsedLogin.success) {
    return res.status(400).json({ error: parsedLogin.error.issues[0].message });
  }
  const { email, password } = parsedLogin.data;
  const findAdmin = await Admin.findOne({ email });
  if (!findAdmin) {
    return res.status(401).json({
      error: "User don't have any account",
    });
  }

  // Add this check to handle Google-only accounts
  if (!findAdmin.password) {
    return res.status(403).json({
      error:
        "This account uses Google Sign-In. Please use the 'Sign in with Google' button.",
    });
  }

  const confirmPassword = await bcrypt.compare(password, findAdmin.password);
  if (!confirmPassword) {
    return res.status(402).json({
      error: "password is wrong.",
    });
  }
  // Include email and adminId in the JWT payload
  const token = jwt.sign(
    { adminId: findAdmin._id, email: findAdmin.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  return res.status(200).json({
    message: "you have logged in successfully :)",
    token: token,
    adminInfo: {
      email: findAdmin.email,
      username: findAdmin.name,
    },
  });
}

async function createCourse(req, res) {
  try {
    const { title, description, price, category, tags, duration } = req.body;
    const adminId = req.adminId; // Correctly use adminId from middleware

    if (!title || !description || !price || !category) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const courseData = {
      title,
      description,
      price,
      category,
      tags: tags || [],
      duration,
      createdBy: adminId,
    };

    // Handle thumbnail upload if provided
    if (req.file) {
      try {
        console.log("req.file object:", JSON.stringify(req.file, null, 2));

        // The file is already uploaded to Cloudinary by the middleware
        // req.file contains the Cloudinary information
        courseData.thumbnail = {
          public_id: req.file.filename || req.file.public_id, // Try both properties
          url: req.file.path || req.file.secure_url, // Try both properties
        };

        console.log("Thumbnail data to save:", courseData.thumbnail);
      } catch (uploadError) {
        console.error("Thumbnail processing error:", uploadError);
        return res.status(500).json({
          message: "Failed to process thumbnail",
          error: uploadError.message,
        });
      }
    }

    const newCourse = new Course(courseData);
    await newCourse.save();

    res
      .status(201)
      .json({ message: "Course created successfully", course: newCourse });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getAdminUploads(req, res) {
  try {
    const email = req.userEmail;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(403).json({ error: "Email can't be found" });
    }

    return res.json(admin.uploads);
  } catch (err) {
    console.error("Content fetch error:", err);
    return res
      .status(500)
      .json({ error: err.message || "internal server error" });
  }
}

async function deleteAdminAccount(req, res) {
  const deleteAccountSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });
  const parsedDelete = deleteAccountSchema.safeParse(req.body);
  if (!parsedDelete.success) {
    return res
      .status(400)
      .json({ error: parsedDelete.error.issues[0].message });
  }
  const { email, password } = parsedDelete.data;
  try {
    const FindAccount = await Admin.findOne({ email });
    if (!FindAccount) {
      res.status(404).json({
        error: "Can't find the account",
      });
    }
    const Checkpassword = await bcrypt.compare(password, FindAccount.password);
    if (!Checkpassword) {
      res.status(403).json({
        error: "Password doesn't match.",
      });
    }
    await Admin.deleteOne({ email });
    return res
      .status(200)
      .json({ message: "Successfully deleted the account." });
  } catch (err) {
    res.status(500).json({
      error: "internal server error.",
    });
  }
}

async function deleteCourse(req, res) {
  try {
    const { id: courseId } = req.params;
    const adminId = req.adminId;

    // Find the course and verify ownership
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.createdBy.toString() !== adminId) {
      return res.status(403).json({
        message: "Access denied. You can only delete your own courses.",
      });
    }

    // Delete GCS assets for the entire course
    try {
      await deleteCourseAssets(adminId, courseId);
    } catch (gcsError) {
      console.warn("[DELETE_COURSE] GCS deletion failed:", gcsError.message);
      // Continue with other cleanup even if GCS fails
    }

    // Prepare deletion promises for Cloudinary assets (thumbnails, notes, etc.)
    const deletionPromises = [];

    // Delete thumbnail if exists
    if (course.thumbnail && course.thumbnail.public_id) {
      deletionPromises.push(
        cloudinary.uploader
          .destroy(course.thumbnail.public_id)
          .catch((err) => console.warn("Failed to delete thumbnail:", err))
      );
    }

    // Delete course notes/materials from Cloudinary if they exist
    if (course.notes && Array.isArray(course.notes)) {
      course.notes.forEach((note) => {
        if (note.public_id) {
          deletionPromises.push(
            cloudinary.uploader
              .destroy(note.public_id)
              .catch((err) => console.warn("Failed to delete note:", err))
          );
        }
      });
    }

    // Execute Cloudinary deletions in parallel
    await Promise.all(deletionPromises);

    // Delete all Video documents associated with this course
    await Video.deleteMany({ course: courseId });

    // Delete the course document
    await Course.findByIdAndDelete(courseId);

    res.status(200).json({
      message: "Course and all associated media deleted successfully.",
    });
  } catch (error) {
    console.error("[DELETE_COURSE] Error:", error);
    res.status(500).json({
      message: "Failed to delete course",
      error: error.message,
    });
  }
}

async function addVideoToCourse(req, res) {
  try {
    const { courseId } = req.params;
    const { title, description } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const newVideos = req.files.map((file) => ({
      url: file.path,
      type: "video",
      title: title || "Untitled Video",
      description: description || "",
    }));

    course.videos.push(...newVideos);

    await course.save();

    res.status(200).json({ message: "Videos added successfully", course });
  } catch (err) {
    console.error("--- ERROR in addVideoToCourse ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function updateCourse(req, res) {
  try {
    const { courseId } = req.params;
    const updates = req.body;
    const adminId = req.adminId;

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }

    // Ensure the admin owns the course
    if (course.createdBy.toString() !== adminId) {
      return res
        .status(403)
        .json({ error: "Forbidden. You do not own this course." });
    }

    // Update the course with the new data
    const updatedCourse = await Course.findByIdAndUpdate(courseId, updates, {
      new: true, // Return the updated document
      runValidators: true, // Run schema validators on update
    });

    res
      .status(200)
      .json({ message: "Course updated successfully", course: updatedCourse });
  } catch (err) {
    console.error("--- ERROR in updateCourse ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// Get all courses (for admin dashboard)
async function getAllCourses(req, res) {
  try {
    const courses = await Course.find({ createdBy: req.adminId }).populate(
      "createdBy",
      "email"
    );

    // Transform courses to ensure consistent thumbnail field structure
    const transformedCourses = courses.map((course) => {
      const courseObj = course.toObject();

      // Handle legacy thumbnailurl field
      if (
        courseObj.thumbnailurl &&
        !courseObj.thumbnailUrl &&
        !courseObj.thumbnail?.url
      ) {
        courseObj.thumbnailUrl = courseObj.thumbnailurl;
        courseObj.thumbnail = { url: courseObj.thumbnailurl };
      }

      // Ensure thumbnailUrl exists for components that expect it
      if (courseObj.thumbnail?.url && !courseObj.thumbnailUrl) {
        courseObj.thumbnailUrl = courseObj.thumbnail.url;
      }

      return courseObj;
    });

    res.status(200).json({ courses: transformedCourses });
  } catch (err) {
    console.error("--- ERROR in getAllCourses ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// Get a single course by ID
async function getCourseById(req, res) {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate(
      "createdBy",
      "fullName"
    );

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const ownerId = course.createdBy?._id
      ? course.createdBy._id.toString()
      : course.createdBy.toString();
    if (ownerId !== req.adminId) {
      return res
        .status(403)
        .json({ error: "Forbidden. You do not own this course." });
    }

    // Debug logging for thumbnail data
    console.log("[getCourseById] Course thumbnail data:", {
      hasThumbnail: !!course.thumbnail,
      thumbnailUrl: course.thumbnail?.url,
      thumbnailPublicId: course.thumbnail?.public_id,
      courseTitle: course.title,
    });

    res.status(200).json({ course });
  } catch (err) {
    console.error("--- ERROR in getCourseById ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).select("-password");
    if (!admin) {
      return res.status(404).json({ error: "Admin not found." });
    }
    res.status(200).json(admin);
  } catch (err) {
    console.error("--- ERROR in getAdminProfile ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const {
      fullName,
      headline,
      bio,
      description,
      country,
      profession,
      socialLinks,
      expertise,
    } = req.body;
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.adminId,
      {
        fullName,
        headline,
        bio,
        description,
        country,
        profession,
        socialLinks,
        expertise,
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedAdmin) {
      return res.status(404).json({ error: "Admin not found." });
    }

    res
      .status(200)
      .json({ message: "Profile updated successfully", admin: updatedAdmin });
  } catch (err) {
    console.error("--- ERROR in updateAdminProfile ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateAdminProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const admin = await Admin.findById(req.adminId);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found." });
    }

    // If there's an old photo, delete it from Cloudinary
    if (admin.profilePhoto && admin.profilePhoto.public_id) {
      await cloudinary.uploader.destroy(admin.profilePhoto.public_id);
    }

    // Update with the new photo
    admin.profilePhoto = {
      url: req.file.path,
      public_id: req.file.filename,
    };

    await admin.save();

    res.status(200).json({
      message: "Profile photo updated successfully",
      profilePhoto: admin.profilePhoto,
    });
  } catch (err) {
    console.error("--- ERROR in updateAdminProfilePhoto ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getAllAdminsAsInstructors = async (req, res) => {
  try {
    const instructors = await Admin.find({}).select(
      "fullName profilePhoto headline description expertise"
    );
    res.status(200).json({ instructors });
  } catch (err) {
    console.error("--- ERROR in getAllAdminsAsInstructors ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Admin Google OAuth Login/Signup
async function adminGoogleAuth(req, res) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Google credential is required" });
    }

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ error: "Email not provided by Google" });
    }

    // Check if admin already exists
    let admin = await Admin.findOne({
      $or: [{ email }, { googleId }],
    });

    if (admin) {
      // Update existing admin with Google info if needed
      if (!admin.googleId) {
        admin.googleId = googleId;
        admin.profilePicture = picture;
        await admin.save();
      }
    } else {
      // Create new admin account
      admin = new Admin({
        fullName: name,
        email,
        googleId,
        profilePicture: picture,
        // No password needed for Google OAuth admins
      });
      await admin.save();
    }

    // Generate JWT token with adminId
    const token = jwt.sign(
      { adminId: admin._id, email: admin.email },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      message: "Admin Google authentication successful",
      token,
      adminInfo: {
        email: admin.email,
        username: admin.fullName,
        profilePicture: admin.profilePicture,
      },
    });
  } catch (error) {
    console.error("Admin Google Auth Error:", error);
    res.status(500).json({ error: "Google authentication failed" });
  }
}

async function createVideoUploadSession(req, res) {
  try {
    const { courseId } = req.params;
    const { videoTitle, fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }
    if (course.createdBy.toString() !== req.adminId) {
      return res
        .status(403)
        .json({ error: "Forbidden. You do not own this course." });
    }

    // Create a Video document first to derive a stable assetId
    const videoDoc = new Video({
      title: videoTitle || fileName,
      url: "",
      course: courseId,
      status: "uploading",
    });
    const assetId = videoDoc._id.toString();
    const adminId = req.adminId;
    const gcsFileName = `uploads/${adminId}/${courseId}/${assetId}/${assetId}-${fileName}`;

    const file = sourceBucket.file(gcsFileName);
    const options = {
      version: "v4",
      action: "resumable",
      expires: Date.now() + 30 * 60 * 1000, // URL expires in 30 minutes
      contentType,
    };

    const [uploadUrl] = await file.getSignedUrl(options);

    // Persist the GCS URI on the Video doc and update course collections
    videoDoc.url = `gs://${process.env.GCS_SOURCE_BUCKET}/${gcsFileName}`;
    await videoDoc.save();

    course.videos.push({ url: videoDoc.url, type: "video" });
    course.videoLectures.push({
      title: videoTitle || fileName,
      assetId,
      status: "uploading",
    });
    await course.save();

    res.status(200).json({ uploadUrl, assetId });
  } catch (error) {
    console.error("Error creating video upload session:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

const generateVideoUploadUrl = async (req, res) => {
  const { courseId } = req.params;
  const { fileName, fileType } = req.body;

  if (!fileName || !fileType) {
    return res
      .status(400)
      .json({ error: "fileName and fileType are required." });
  }

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    if (course.createdBy.toString() !== req.adminId) {
      return res
        .status(403)
        .json({ error: "Forbidden. You do not own this course." });
    }

    // Create a video record first to obtain assetId for object naming
    const newVideo = new Video({
      title: fileName,
      url: "",
      course: courseId,
      status: "uploading",
    });
    const assetId = newVideo._id.toString();
    const adminId = req.adminId;
    const objectName = `uploads/${adminId}/${courseId}/${assetId}/${assetId}-${fileName}`;

    const options = {
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: fileType,
    };

    // Use env-configured sourceBucket for signing
    const [url] = await sourceBucket.file(objectName).getSignedUrl(options);

    // Persist video with its GCS URI
    newVideo.url = `gs://${process.env.GCS_SOURCE_BUCKET}/${objectName}`;
    await newVideo.save();

    // Track in legacy and new structures
    course.videos.push({ url: newVideo.url, type: "video" });
    course.videoLectures.push({
      title: fileName,
      assetId,
      status: "uploading",
    });
    await course.save();

    res.status(200).json({
      signedUrl: url,
      videoId: newVideo._id,
      assetId,
      gcsUri: newVideo.url,
    });
  } catch (err) {
    console.error("--- ERROR in generateVideoUploadUrl ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Mark upload completion and update statuses
async function markVideoUploadComplete(req, res) {
  try {
    const { courseId, videoId } = req.params;

    // Update Video document status -> now 'processing' after upload completes
    const video = await Video.findByIdAndUpdate(
      videoId,
      { status: "processing" },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Update nested course videoLectures status
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    if (course.createdBy.toString() !== req.adminId) {
      return res
        .status(403)
        .json({ error: "Forbidden. You do not own this course." });
    }

    const lecture = course.videoLectures.find((v) => v.assetId === videoId);
    if (lecture) {
      lecture.status = "processing";
    } else {
      // Backfill if entry was missing
      course.videoLectures.push({
        title: video.title,
        assetId: videoId,
        status: "processing",
      });
    }

    await course.save();

    console.log(`[DEBUG] About to publish PubSub message for video ${videoId}`);
    console.log(`[DEBUG] Video GCS URI: ${video.url}`);
    console.log(`[DEBUG] Course ID: ${courseId}, Admin ID: ${req.adminId}`);

    try {
      const topicName = "vod-uploads";
      const topic = pubsub.topic(topicName);
      const message = {
        videoId,
        courseId,
        adminId: req.adminId,
        gcsUri: video.url,
        timestamp: new Date().toISOString(),
      };

      console.log(
        `[DEBUG] Publishing message to topic ${topicName}:`,
        JSON.stringify(message, null, 2)
      );

      const messageId = await topic.publishMessage({
        data: Buffer.from(JSON.stringify(message)),
      });

      console.log(
        `[SUCCESS] Published message ${messageId} to topic ${topicName}`
      );
    } catch (pubsubError) {
      console.error("[ERROR] Failed to publish PubSub message:", pubsubError);
      // Don't fail the request if PubSub fails
    }

    res.status(200).json({ message: "Video marked as processing", video });
  } catch (err) {
    console.error("--- ERROR in markVideoUploadComplete ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// Encoder callback: mark video encoded and completed
async function markVideoEncoded(req, res) {
  try {
    const { courseId: maybeCourseId, videoId } = req.params;

    // Simple shared-secret authorization for encoder callbacks
    const secret = req.headers["x-encoder-secret"];
    if (!secret || secret !== process.env.ENCODER_CALLBACK_SECRET) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Find the Video first (also gives us the course if not provided)
    const video = await Video.findByIdAndUpdate(
      videoId,
      { status: "completed" },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    const resolvedCourseId =
      maybeCourseId || (video.course && video.course.toString());
    if (!resolvedCourseId) {
      return res
        .status(400)
        .json({ error: "Unable to resolve course for video." });
    }

    const course = await Course.findById(resolvedCourseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Compute public playback URL for Plyr/HLS
    const ownerId = course.createdBy?._id
      ? course.createdBy._id.toString()
      : course.createdBy.toString();
    const publicBucket = process.env.GCS_PUBLIC_BUCKET;
    const playbackUrl = `https://${publicBucket}.storage.googleapis.com/assets/${ownerId}/${resolvedCourseId}/${videoId}/master.m3u8`;

    const lecture = course.videoLectures.find((v) => v.assetId === videoId);
    if (lecture) {
      lecture.status = "completed";
      lecture.playbackUrl = playbackUrl;
    } else {
      course.videoLectures.push({
        title: video.title,
        assetId: videoId,
        status: "completed",
        playbackUrl,
      });
    }

    await course.save();

    res.status(200).json({ message: "Video marked as encoded", video });
  } catch (err) {
    console.error("--- ERROR in markVideoEncoded ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// Delete a specific video from a course
async function deleteVideo(req, res) {
  try {
    const { courseId, assetId } = req.params;
    const adminId = req.adminId;

    // Find the course and verify ownership
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.createdBy.toString() !== adminId) {
      return res.status(403).json({
        message: "Access denied. You can only manage your own courses.",
      });
    }

    // Find the video lecture to delete
    const videoLecture = course.videoLectures.find(
      (v) => v.assetId === assetId
    );
    if (!videoLecture) {
      return res.status(404).json({ message: "Video not found in course" });
    }

    // Delete GCS assets
    try {
      await deleteVideoAssets(adminId, courseId, assetId);
    } catch (gcsError) {
      console.warn("[DELETE_VIDEO] GCS deletion failed:", gcsError.message);
      // Continue with database cleanup even if GCS fails
    }

    // Remove video from course.videoLectures array
    course.videoLectures = course.videoLectures.filter(
      (v) => v.assetId !== assetId
    );
    await course.save();

    // Delete the Video document
    await Video.findOneAndDelete({
      course: courseId,
      url: { $regex: assetId },
    });

    res.status(200).json({
      message: "Video deleted successfully",
      course: course,
    });
  } catch (error) {
    console.error("[DELETE_VIDEO] Error:", error);
    res
      .status(500)
      .json({ message: "Failed to delete video", error: error.message });
  }
}

async function updateVideo(req, res) {
  try {
    const { courseId, assetId } = req.params;
    const { title, description, order } = req.body;
    const adminId = req.adminId;

    // Find the course and verify ownership
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (course.createdBy.toString() !== adminId) {
      return res.status(403).json({
        error: "Access denied. You can only update your own courses.",
      });
    }

    // Find the video in videoLectures array
    const videoIndex = course.videoLectures.findIndex(
      (video) => video.assetId === assetId
    );

    if (videoIndex === -1) {
      return res.status(404).json({ error: "Video not found in course" });
    }

    // Update video fields
    if (title !== undefined) course.videoLectures[videoIndex].title = title;
    if (description !== undefined)
      course.videoLectures[videoIndex].description = description;
    if (order !== undefined) course.videoLectures[videoIndex].order = order;

    await course.save();

    res.status(200).json({
      message: "Video updated successfully",
      video: course.videoLectures[videoIndex],
    });
  } catch (error) {
    console.error("Error updating video:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// Enhanced updateCourse to handle more fields
async function updateCourseInfo(req, res) {
  try {
    const { courseId } = req.params;
    const updates = req.body;
    const adminId = req.adminId;

    // Parse tags if it's a JSON string (from FormData)
    if (typeof updates.tags === "string" && updates.tags.startsWith("[")) {
      try {
        updates.tags = JSON.parse(updates.tags);
      } catch (e) {
        // If parsing fails, treat as comma-separated string
        updates.tags = updates.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.createdBy.toString() !== adminId) {
      return res.status(403).json({
        message: "Access denied. You can only update your own courses.",
      });
    }

    // Filter allowed update fields
    const allowedFields = [
      "title",
      "description",
      "category",
      "level",
      "duration",
      "tags",
    ];

    // Normalize tags if provided as a comma-separated string
    if (typeof updates.tags === "string") {
      updates.tags = updates.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const filteredUpdates = {};

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    // Handle thumbnail upload if present
    if (req.file) {
      try {
        console.log("req.file object:", JSON.stringify(req.file, null, 2));

        // The file is already uploaded to Cloudinary by the middleware
        // req.file contains the Cloudinary information
        filteredUpdates.thumbnail = {
          public_id: req.file.filename || req.file.public_id, // Try both properties
          url: req.file.path || req.file.secure_url, // Try both properties
        };

        console.log("Thumbnail data to save:", filteredUpdates.thumbnail);
      } catch (uploadError) {
        console.error("Thumbnail processing error:", uploadError);
        return res.status(500).json({
          message: "Failed to process thumbnail",
          error: uploadError.message,
        });
      }
    }

    console.log(
      "Filtered updates before save:",
      JSON.stringify(filteredUpdates, null, 2)
    );

    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      filteredUpdates,
      { new: true, runValidators: true }
    );

    console.log("Updated course thumbnail:", updatedCourse.thumbnail);

    res.status(200).json({
      message: "Course updated successfully",
      course: updatedCourse,
    });
  } catch (error) {
    console.error("[UPDATE_COURSE_INFO] Error:", error);
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation error", error: error.message });
    }
    res
      .status(500)
      .json({ message: "Failed to update course", error: error.message });
  }
}

// Generate captions for video using the local Python script
const generateCaptions = async (req, res) => {
  console.log("[GENERATE_CAPTIONS] Route called with params:", req.params);
  console.log("[GENERATE_CAPTIONS] Admin ID:", req.adminId);

  try {
    const { courseId, assetId } = req.params;
    const adminId = req.adminId;

    console.log(
      "[GENERATE_CAPTIONS] Searching for course:",
      courseId,
      "by admin:",
      adminId
    );

    const course = await Course.findOne({ _id: courseId, createdBy: adminId });
    if (!course) {
      console.log("[GENERATE_CAPTIONS] Course not found - returning 404");
      return res.status(404).json({ message: "Course not found" });
    }
    console.log("[GENERATE_CAPTIONS] Course found:", course.title);
    console.log(
      "[GENERATE_CAPTIONS] Course has",
      course.videoLectures.length,
      "videos"
    );
    console.log("[GENERATE_CAPTIONS] Looking for assetId:", assetId);
    console.log(
      "[GENERATE_CAPTIONS] Available video IDs:",
      course.videoLectures.map((v) => ({
        _id: v._id,
        assetId: v.assetId,
        title: v.title,
      }))
    );

    const video = course.videoLectures.id(assetId);
    if (!video) {
      console.log(
        "[GENERATE_CAPTIONS] Video not found with .id() method, trying find()"
      );
      const videoByFind = course.videoLectures.find(
        (v) => v._id.toString() === assetId || v.assetId === assetId
      );
      if (!videoByFind) {
        console.log("[GENERATE_CAPTIONS] Video not found - returning 404");
        return res.status(404).json({ message: "Video not found" });
      }
      console.log(
        "[GENERATE_CAPTIONS] Video found with find():",
        videoByFind.title,
        "status:",
        videoByFind.status
      );
      // Use the found video
      const foundVideo = videoByFind;

      if (foundVideo.status !== "completed") {
        console.log("[GENERATE_CAPTIONS] Video not completed - returning 400");
        return res.status(400).json({
          message: "Video must be completed before generating captions",
        });
      }

      if (foundVideo.captionStatus === "processing") {
        console.log(
          "[GENERATE_CAPTIONS] Captions already processing - returning 409"
        );
        return res
          .status(409)
          .json({ message: "Captions are already being generated" });
      }

      foundVideo.captionStatus = "processing";
      foundVideo.captionTrackUrl = "";
      await course.save();

      res.status(202).json({
        message: "Caption generation started.",
        captionStatus: "processing",
      });

      // Continue with Python script execution using foundVideo...
      const scriptPath = path.join(
        __dirname,
        "..",
        "scripts",
        "transcribe_to_vtt.py"
      );
      const args = [
        scriptPath,
        "--input",
        foundVideo.playbackUrl,
        "--bucket",
        process.env.GCS_PUBLIC_BUCKET,
        "--admin-id",
        adminId,
        "--course-id",
        courseId,
        "--asset-id",
        assetId,
        "--model",
        "tiny", // Use faster tiny model for quicker caption generation
        "--generate-all-langs", // Generate English, Hindi, and Punjabi captions
      ];

      console.log(
        "[GENERATE_CAPTIONS] Executing Python script with args:",
        args
      );

      const pythonProcess = spawn("python3", ["-u", ...args], {
        env: {
          ...process.env,
          GOOGLE_APPLICATION_CREDENTIALS:
            process.env.GOOGLE_APPLICATION_CREDENTIALS,
          PYTHONUNBUFFERED: "1",
        },
      });
      console.log("[GENERATE_CAPTIONS] Python script spawned with args:", args);
      console.log(
        "[GENERATE_CAPTIONS] Video playback URL:",
        foundVideo.playbackUrl
      );
      console.log(
        "[GENERATE_CAPTIONS] GCS bucket:",
        process.env.GCS_PUBLIC_BUCKET
      );
      console.log(
        "[GENERATE_CAPTIONS] Starting caption generation at:",
        new Date().toISOString()
      );

      let scriptOutput = "";
      let scriptError = "";
      let lastLogTime = Date.now();
      let lastProgressUpdate = Date.now();

      pythonProcess.stdout.on("data", (data) => {
        const output = data.toString();
        const timestamp = new Date().toISOString();

        // Log each line with timestamp for real-time monitoring
        const lines = output.split("\n").filter((line) => line.trim());
        lines.forEach((line) => {
          // Highlight progress lines with special formatting
          if (
            line.includes("[PROGRESS]") ||
            line.includes("OVERALL PROGRESS")
          ) {
            console.log(`\n ${line}\n`);
          } else if (line.includes("[SUCCESS]")) {
            console.log(` [${timestamp}] ${line}`);
          } else if (line.includes("[ERROR]")) {
            console.error(` [${timestamp}] ${line}`);
          } else {
            console.log(`[${timestamp}] [CAPTION-STDOUT] ${line}`);
          }
        });

        scriptOutput += output;
        lastProgressUpdate = Date.now();

        // Show heartbeat every 30 seconds if no progress updates
        const now = Date.now();
        if (now - lastLogTime > 30000 && now - lastProgressUpdate > 30000) {
          const elapsed = Math.floor((now - lastLogTime) / 1000);
          console.log(
            ` [${timestamp}] [CAPTION-HEARTBEAT] Caption generation running for ${elapsed}s...`
          );
          lastLogTime = now;
        }
      });

      pythonProcess.stderr.on("data", (data) => {
        const error = data.toString();
        const timestamp = new Date().toISOString();

        // Log errors with timestamp
        const lines = error.split("\n").filter((line) => line.trim());
        lines.forEach((line) => {
          console.error(`[${timestamp}] [CAPTION-STDERR] ${line}`);
        });

        scriptError += error;
      });

      pythonProcess.on("close", async (code) => {
        const timestamp = new Date().toISOString();
        console.log(
          `[${timestamp}] [CAPTION-COMPLETE] Python script exited with code ${code}`
        );

        if (scriptOutput.trim()) {
          console.log(
            `[${timestamp}] [CAPTION-OUTPUT] Full stdout:\n${scriptOutput}`
          );
        }
        if (scriptError.trim()) {
          console.error(
            `[${timestamp}] [CAPTION-ERROR] Full stderr:\n${scriptError}`
          );
        }

        try {
          const courseToUpdate = await Course.findById(courseId);
          const videoToUpdate = courseToUpdate.videoLectures.find(
            (v) => v._id.toString() === assetId || v.assetId === assetId
          );

          if (code === 0) {
            // Extract the VTT URL from output - look for lines containing storage.googleapis.com
            const outputLines = scriptOutput.trim().split("\n");
            let vttUrl = null;

            // Look for the actual URL in the output (not the success message)
            for (let i = outputLines.length - 1; i >= 0; i--) {
              const line = outputLines[i].trim();
              if (
                line.startsWith("https://storage.googleapis.com") &&
                line.includes("captions_en.vtt")
              ) {
                vttUrl = line;
                break;
              }
            }

            console.log(
              `[${timestamp}] [CAPTION-URL] Extracted VTT URL: ${vttUrl}`
            );

            if (vttUrl && vttUrl.startsWith("https://")) {
              videoToUpdate.captionStatus = "completed";
              videoToUpdate.captionTrackUrl = vttUrl;
              console.log(
                `[${timestamp}] [CAPTION-SUCCESS] Caption generation completed successfully for video: ${videoToUpdate.title}`
              );
            } else {
              videoToUpdate.captionStatus = "failed";
              console.error(
                `[${timestamp}] [CAPTION-FAIL] Invalid VTT URL in script output: ${vttUrl}`
              );
            }
          } else {
            videoToUpdate.captionStatus = "failed";
            console.error(
              `[${timestamp}] [CAPTION-FAIL] Caption generation failed with exit code: ${code}`
            );
            if (scriptError) {
              console.error(
                `[${timestamp}] [CAPTION-FAIL] Error details: ${scriptError}`
              );
            }
          }

          await courseToUpdate.save();
          console.log(
            `[${timestamp}] [CAPTION-DB] Updated video caption status in database: ${videoToUpdate.captionStatus}`
          );
        } catch (error) {
          console.error(
            `[${new Date().toISOString()}] [CAPTION-DB-ERROR] Error updating video status: ${error}`
          );
        }
      });

      pythonProcess.on("error", (error) => {
        const timestamp = new Date().toISOString();
        console.error(
          `[${timestamp}] [CAPTION-PROCESS-ERROR] Python process error: ${error}`
        );
      });

      // Log process start
      console.log(
        `[${new Date().toISOString()}] [CAPTION-START] Caption generation process started with PID: ${
          pythonProcess.pid
        }`
      );
      return;
    }
    console.log(
      "[GENERATE_CAPTIONS] Video found:",
      video.title,
      "status:",
      video.status
    );
    if (video.status !== "completed") {
      console.log("[GENERATE_CAPTIONS] Video not completed - returning 400");
      return res.status(400).json({
        message: "Video must be completed before generating captions",
      });
    }

    if (video.captionStatus === "processing") {
      console.log(
        "[GENERATE_CAPTIONS] Captions already processing - returning 409"
      );
      return res
        .status(409)
        .json({ message: "Captions are already being generated" });
    }

    video.captionStatus = "processing";
    video.captionTrackUrl = "";
    await course.save();

    res.status(202).json({
      message: "Caption generation started.",
      captionStatus: "processing",
    });

    // Asynchronously spawn the Python script
    const scriptPath = path.join(
      __dirname,
      "..",
      "scripts",
      "transcribe_to_vtt.py"
    );
    const args = [
      scriptPath,
      "--input",
      video.playbackUrl,
      "--bucket",
      process.env.GCS_PUBLIC_BUCKET,
      "--admin-id",
      adminId,
      "--course-id",
      courseId,
      "--asset-id",
      assetId,
      "--model",
      "tiny", // Use faster tiny model for quicker caption generation
      "--generate-all-langs", // Generate English, Hindi, and Punjabi captions
    ];

    console.log("[GENERATE_CAPTIONS] Executing Python script with args:", args);
    console.log("[GENERATE_CAPTIONS] Video playback URL:", video.playbackUrl);
    console.log(
      "[GENERATE_CAPTIONS] GCS bucket:",
      process.env.GCS_PUBLIC_BUCKET
    );
    console.log(
      "[GENERATE_CAPTIONS] Starting caption generation at:",
      new Date().toISOString()
    );

    const pythonProcess = spawn("python3", ["-u", ...args], {
      env: {
        ...process.env,
        GOOGLE_APPLICATION_CREDENTIALS:
          process.env.GOOGLE_APPLICATION_CREDENTIALS,
        PYTHONUNBUFFERED: "1",
      },
    });

    let scriptOutput = "";
    let scriptError = "";
    let lastLogTime = Date.now();
    let lastProgressUpdate = Date.now();

    pythonProcess.stdout.on("data", (data) => {
      const output = data.toString();
      const timestamp = new Date().toISOString();

      // Log each line with timestamp for real-time monitoring
      const lines = output.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        // Highlight progress lines with special formatting
        if (line.includes("[PROGRESS]") || line.includes("OVERALL PROGRESS")) {
          console.log(`\n ${line}\n`);
        } else if (line.includes("[SUCCESS]")) {
          console.log(` [${timestamp}] ${line}`);
        } else if (line.includes("[ERROR]")) {
          console.error(` [${timestamp}] ${line}`);
        } else {
          console.log(`[${timestamp}] [CAPTION-STDOUT] ${line}`);
        }
      });

      scriptOutput += output;
      lastProgressUpdate = Date.now();

      // Show heartbeat every 30 seconds if no progress updates
      const now = Date.now();
      if (now - lastLogTime > 30000 && now - lastProgressUpdate > 30000) {
        const elapsed = Math.floor((now - lastLogTime) / 1000);
        console.log(
          ` [${timestamp}] [CAPTION-HEARTBEAT] Caption generation running for ${elapsed}s...`
        );
        lastLogTime = now;
      }
    });

    pythonProcess.stderr.on("data", (data) => {
      const error = data.toString();
      const timestamp = new Date().toISOString();

      // Log errors with timestamp
      const lines = error.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        console.error(`[${timestamp}] [CAPTION-STDERR] ${line}`);
      });

      scriptError += error;
    });

    pythonProcess.on("close", async (code) => {
      const timestamp = new Date().toISOString();
      console.log(
        `[${timestamp}] [CAPTION-COMPLETE] Python script exited with code ${code}`
      );

      if (scriptOutput.trim()) {
        console.log(
          `[${timestamp}] [CAPTION-OUTPUT] Full stdout:\n${scriptOutput}`
        );
      }
      if (scriptError.trim()) {
        console.error(
          `[${timestamp}] [CAPTION-ERROR] Full stderr:\n${scriptError}`
        );
      }

      try {
        const courseToUpdate = await Course.findById(courseId);
        const videoToUpdate = courseToUpdate.videoLectures.id(assetId);

        if (code === 0) {
          // Extract the VTT URL from output - look for lines containing storage.googleapis.com
          const outputLines = scriptOutput.trim().split("\n");
          let vttUrl = null;

          // Look for the actual URL in the output (not the success message)
          for (let i = outputLines.length - 1; i >= 0; i--) {
            const line = outputLines[i].trim();
            if (
              line.startsWith("https://storage.googleapis.com") &&
              line.includes("captions_en.vtt")
            ) {
              vttUrl = line;
              break;
            }
          }

          console.log(
            `[${timestamp}] [CAPTION-URL] Extracted VTT URL: ${vttUrl}`
          );

          if (vttUrl && vttUrl.startsWith("https://")) {
            videoToUpdate.captionStatus = "completed";
            videoToUpdate.captionTrackUrl = vttUrl;
            console.log(
              `[${timestamp}] [CAPTION-SUCCESS] Caption generation completed successfully for video: ${video.title}`
            );
          } else {
            videoToUpdate.captionStatus = "failed";
            console.error(
              `[${timestamp}] [CAPTION-FAIL] Invalid VTT URL in script output: ${vttUrl}`
            );
          }
        } else {
          videoToUpdate.captionStatus = "failed";
          console.error(
            `[${timestamp}] [CAPTION-FAIL] Caption generation failed with exit code: ${code}`
          );
          if (scriptError) {
            console.error(
              `[${timestamp}] [CAPTION-FAIL] Error details: ${scriptError}`
            );
          }
        }

        await courseToUpdate.save();
        console.log(
          `[${timestamp}] [CAPTION-DB] Updated video caption status in database: ${videoToUpdate.captionStatus}`
        );
      } catch (error) {
        console.error(
          `[${new Date().toISOString()}] [CAPTION-DB-ERROR] Error updating video status: ${error}`
        );
      }
    });

    pythonProcess.on("error", (error) => {
      const timestamp = new Date().toISOString();
      console.error(
        `[${timestamp}] [CAPTION-PROCESS-ERROR] Python process error: ${error}`
      );
    });

    // Log process start
    console.log(
      `[${new Date().toISOString()}] [CAPTION-START] Caption generation process started with PID: ${
        pythonProcess.pid
      }`
    );
  } catch (error) {
    console.error("Error starting caption generation:", error);
    // Note: response already sent, so just log the error
  }
};

// --- Admin Forgot Password (OTP) ---
async function adminSendPasswordResetOTP(req, res) {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    admin.resetPasswordOtp = otp;
    admin.resetPasswordExpires = otpExpires;
    await admin.save();

    try {
      await sendEmail({
        to: admin.email,
        subject: "Admin Password Reset OTP",
        text: `Your OTP is: ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`,
      });
      return res.status(200).json({ message: "OTP sent to your email." });
    } catch (e) {
      admin.resetPasswordOtp = undefined;
      admin.resetPasswordExpires = undefined;
      await admin.save();
      return res
        .status(500)
        .json({ error: "Error sending email. Please try again later." });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function adminVerifyPasswordResetOTP(req, res) {
  try {
    const { email, otp } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found." });
    }

    if (
      admin.resetPasswordOtp !== otp ||
      admin.resetPasswordExpires < new Date()
    ) {
      return res.status(403).json({ error: "Invalid or expired OTP." });
    }

    admin.resetPasswordOtp = undefined;
    admin.resetPasswordExpires = undefined;
    await admin.save();

    return res.status(200).json({ message: "OTP verified successfully." });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function adminResetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;

    const admin = await Admin.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!admin) {
      return res
        .status(400)
        .json({ error: "Invalid OTP or email, or OTP has expired." });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedNewPassword;
    admin.resetPasswordOtp = undefined;
    admin.resetPasswordExpires = undefined;
    await admin.save();

    return res
      .status(200)
      .json({ message: "Password has been reset successfully." });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error." });
  }
}

module.exports = {
  loginAdmin,
  createCourse,
  getAdminUploads,
  deleteAdminAccount,
  deleteCourse,
  addVideoToCourse,
  updateCourse,
  getAllCourses,
  getCourseById,
  getAdminProfile,
  updateAdminProfile,
  updateAdminProfilePhoto,
  getAllAdminsAsInstructors,
  adminGoogleAuth,
  createVideoUploadSession,
  generateVideoUploadUrl,
  markVideoUploadComplete,
  markVideoEncoded,
  deleteVideo,
  updateVideo,
  updateCourseInfo,
  generateCaptions,
  adminSendPasswordResetOTP,
  adminVerifyPasswordResetOTP,
  adminResetPassword,
};
