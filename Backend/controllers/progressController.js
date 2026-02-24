const { Progress } = require("../models/progress");
const { createNotification } = require("../utils/notificationHelper");
const { Course } = require("../models/course");
const { User } = require("../models/user");

// Initialize or get user's progress for a course
const initializeCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId;

    // Verify the user has purchased the course
    const user = await User.findById(userId);
    if (!user.purchasedCourses.includes(courseId)) {
      return res
        .status(403)
        .json({ error: "You must purchase the course to track progress." });
    }

    // Get course details
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }

    // Check if progress already exists
    let progress = await Progress.findOne({ user: userId, course: courseId });

    if (!progress) {
      // Create new progress record
      const videosProgress = course.videos.map((video) => ({
        videoId: video._id,
        isCompleted: false,
        watchTime: 0,
      }));

      progress = new Progress({
        user: userId,
        course: courseId,
        videosProgress,
        totalVideos: course.videos.length,
      });

      await progress.save();
    } else {
      // Update total videos count if new videos were added
      if (course.videos.length > progress.totalVideos) {
        const existingVideoIds = progress.videosProgress.map((vp) =>
          vp.videoId.toString()
        );
        const newVideos = course.videos.filter(
          (video) => !existingVideoIds.includes(video._id.toString())
        );

        newVideos.forEach((video) => {
          progress.videosProgress.push({
            videoId: video._id,
            isCompleted: false,
            watchTime: 0,
          });
        });

        progress.totalVideos = course.videos.length;
        await progress.save();
      }
    }

    res.status(200).json({ message: "Progress initialized", progress });
  } catch (err) {
    console.error("--- ERROR in initializeCourseProgress ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update video progress (mark as completed or update watch time)
const updateVideoProgress = async (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    const { isCompleted, watchTime } = req.body;
    const userId = req.userId;

    // Find user's progress for the course
    const progress = await Progress.findOne({ user: userId, course: courseId });
    if (!progress) {
      return res
        .status(404)
        .json({
          error:
            "Progress record not found. Please initialize course progress first.",
        });
    }

    // Find the specific video progress
    const videoProgress = progress.videosProgress.find(
      (vp) => vp.videoId.toString() === videoId
    );

    if (!videoProgress) {
      return res.status(404).json({ error: "Video not found in course." });
    }

    // Update video progress
    if (typeof isCompleted === "boolean") {
      videoProgress.isCompleted = isCompleted;
      if (isCompleted && !videoProgress.completedAt) {
        videoProgress.completedAt = new Date();
      }
    }

    if (typeof watchTime === "number") {
      videoProgress.watchTime = watchTime;
    }

    await progress.save(); // This will trigger calculateProgress method

    // Check for course completion and send notification
    if (progress.overallProgress === 100 && !progress.completionNotified) {
      // Populate course details to get the title for the notification
      await progress.populate("course", "title");

      await createNotification({
        recipient: userId,
        recipientModel: "User",
        type: "course_completed",
        title: "Congratulations! You've completed a course!",
        message: `You have successfully completed "${progress.course.title}". Well done!`,
        relatedCourse: courseId,
        actionUrl: `/courses/${courseId}/certificate`,
        priority: "high",
      });

      // Mark that notification has been sent to prevent duplicates
      progress.completionNotified = true;
      await progress.save();
    }

    res.status(200).json({ message: "Video progress updated", progress });
  } catch (err) {
    console.error("--- ERROR in updateVideoProgress ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get user's progress for a specific course
const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId;

    const progress = await Progress.findOne({
      user: userId,
      course: courseId,
    }).populate("course", "title thumbnail.url duration");

    if (!progress) {
      return res.status(404).json({ error: "Progress record not found." });
    }

    res.status(200).json({ progress });
  } catch (err) {
    console.error("--- ERROR in getCourseProgress ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get all course progress for a user (dashboard view)
const getUserProgress = async (req, res) => {
  try {
    const userId = req.userId;

    // Get all courses
    const allCourses = await Course.find({}).select(
      "title thumbnail.url duration price"
    );

    // Get existing progress records
    const progressRecords = await Progress.find({ user: userId })
      .populate("course", "title thumbnail.url duration price")
      .sort({ lastAccessedAt: -1 });

    // Create progress records for courses that don't have them yet
    const coursesWithProgress = [];

    for (const course of allCourses) {
      let existingProgress = progressRecords.find(
        (p) => p.course._id.toString() === course._id.toString()
      );

      if (existingProgress) {
        coursesWithProgress.push(existingProgress);
      } else {
        // Create a default progress record for display
        coursesWithProgress.push({
          course: course,
          overallProgress: 0,
          completedVideos: 0,
          totalVideos: course.videos ? course.videos.length : 0,
          isCompleted: false,
          lastAccessedAt: new Date(),
          totalWatchTime: 0,
        });
      }
    }

    // Separate completed and in-progress courses
    const completedCourses = coursesWithProgress.filter((p) => p.isCompleted);
    const inProgressCourses = coursesWithProgress.filter((p) => !p.isCompleted);

    res.status(200).json({
      totalCourses: coursesWithProgress.length,
      completedCourses: completedCourses.length,
      inProgressCourses: inProgressCourses.length,
      progressRecords: coursesWithProgress,
      completedCourses,
      inProgressCourses,
    });
  } catch (err) {
    console.error("--- ERROR in getUserProgress ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// Get progress analytics for admin (for a specific course)
const getCourseAnalytics = async (req, res) => {
  try {
    const { courseId } = req.params;
    const adminEmail = req.userEmail;

    // Verify admin owns the course
    const course = await Course.findById(courseId).populate("createdBy");
    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }

    if (course.createdBy.email !== adminEmail) {
      return res
        .status(403)
        .json({ error: "You can only view analytics for your own courses." });
    }

    // Get all progress records for this course
    const progressRecords = await Progress.find({ course: courseId }).populate(
      "user",
      "username email"
    );

    const totalEnrolled = progressRecords.length;
    const completedCount = progressRecords.filter((p) => p.isCompleted).length;
    const averageProgress =
      totalEnrolled > 0
        ? progressRecords.reduce((sum, p) => sum + p.overallProgress, 0) /
          totalEnrolled
        : 0;

    // Video completion rates
    const videoAnalytics = {};
    if (course.videos.length > 0) {
      course.videos.forEach((video, index) => {
        const completions = progressRecords.filter((p) => {
          const videoProgress = p.videosProgress.find(
            (vp) => vp.videoId.toString() === video._id.toString()
          );
          return videoProgress && videoProgress.isCompleted;
        }).length;

        videoAnalytics[video._id] = {
          videoIndex: index,
          completions,
          completionRate:
            totalEnrolled > 0 ? (completions / totalEnrolled) * 100 : 0,
        };
      });
    }

    res.status(200).json({
      courseTitle: course.title,
      totalEnrolled,
      completedCount,
      completionRate:
        totalEnrolled > 0 ? (completedCount / totalEnrolled) * 100 : 0,
      averageProgress: Math.round(averageProgress),
      videoAnalytics,
      progressRecords,
    });
  } catch (err) {
    console.error("--- ERROR in getCourseAnalytics ---", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  initializeCourseProgress,
  updateVideoProgress,
  getCourseProgress,
  getUserProgress,
  getCourseAnalytics,
};
