const { z } = require("zod");
const { Admin } = require("../models/admin");
const { User } = require("../models/user");
const { Course } = require("../models/course");
const cloudinary = require("cloudinary").v2;

const getAllCourses = async (req, res) => {
  try {
    // 1. Build a filter object from URL query parameters
    const { category, price, tags } = req.query;
    const filter = {};

    if (category) {
      filter.category = category; // Case-sensitive match
    }

    if (price) {
      // Handle a 'free' case or a specific number
      filter.price = price.toLowerCase() === "free" ? 0 : Number(price);
    }

    if (tags) {
      // Find courses that have ALL of the specified tags
      filter.tags = { $all: tags.split(",") };
    }

    // 2. Use the filter object in the find() query
    const courses = await Course.find(filter).populate("createdBy", "email");

    // 3. Transform courses to ensure consistent thumbnail field structure
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
    res.status(500).json({ error: "Failed to fetch courses" });
  }
};

const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      "createdBy",
      "email"
    );
    if (!course) return res.status(404).json({ error: "Course not found" });

    // Return both course and videos (videoLectures) to match frontend expectations
    const videos = course.videoLectures || [];

    res.status(200).json({
      course: course.toObject(),
      videos: videos,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch course" });
  }
};

const purchaseCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.purchasedCourses && user.purchasedCourses.includes(courseId)) {
      return res.status(400).json({ error: "Course already purchased" });
    }

    user.purchasedCourses.push(courseId);
    await user.save();

    res.status(200).json({ message: "Course purchased successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to purchase course" });
  }
};

const getPurchasedCourses = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("purchasedCourses");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ purchased: user.purchasedCourses });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch purchased courses" });
  }
};

const searchCourses = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query "q" is required.' });
    }

    // Use the text index to search
    const courses = await Course.find(
      { $text: { $search: q } },
      // Project a score based on relevance
      { score: { $meta: "textScore" } }
    )
      // Sort by the relevance score
      .sort({ score: { $meta: "textScore" } });

    res.status(200).json(courses);
  } catch (err) {
    console.error("--- ERROR in searchCourses ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getAllCourses,
  getCourseById,
  purchaseCourse,
  getPurchasedCourses,
  searchCourses,
};
