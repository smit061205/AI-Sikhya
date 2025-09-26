import axios from "axios";
import React, { useEffect, useState } from "react";
import { useExploreDropdown } from "../context/ExploreDropdownContext";
import { motion } from "framer-motion";
import { ReactLenis, useLenis } from "lenis/react";
import userApi from "../api/userApi";
import { useNavigate } from "react-router-dom";

const UserDashboard = () => {
  const [userData, setUserData] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [progressStats, setProgressStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalHours: 0,
    streakDays: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { setExploreOpen } = useExploreDropdown();
  const navigate = useNavigate();

  const lenis = useLenis((lenis) => {
    console.log(lenis);
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user profile
        const profileRes = await userApi.get("/user/profile");
        setUserData(profileRes.data);

        // Fetch user progress data
        const progressRes = await userApi.get("/user/progress");
        const progressData = progressRes.data;

        // Transform progress data to match our UI
        const transformedCourses =
          progressData.progressRecords?.map((record) => ({
            _id: record.course._id,
            title: record.course.title,
            thumbnail: record.course.thumbnail,
            progress: Math.round(record.overallProgress),
            totalLessons: record.totalVideos,
            completedLessons: record.completedVideos,
            category: record.course.category || "General",
            lastAccessed: record.lastAccessedAt,
          })) || [];

        setEnrolledCourses(transformedCourses);

        // Set progress stats from real data
        setProgressStats({
          totalCourses: progressData.totalCourses || 0,
          completedCourses: progressData.completedCourses || 0,
          totalHours: Math.round(
            (progressData.progressRecords?.reduce(
              (total, record) => total + (record.totalWatchTime || 0),
              0
            ) || 0) / 3600
          ), // Convert seconds to hours
          streakDays: 0, // This would need to be calculated based on daily activity
        });

        // Generate recent activity from progress data
        const activities = [];
        if (progressData.progressRecords) {
          progressData.completedCourses.forEach((record) => {
            activities.push({
              type: "completed",
              content: `Completed course: ${record.course.title}`,
              time: new Date(record.completedAt).toLocaleDateString(),
            });
          });

          progressData.inProgressCourses.slice(0, 2).forEach((record) => {
            activities.push({
              type: "started",
              content: `Continuing: ${record.course.title}`,
              time: new Date(record.lastAccessedAt).toLocaleDateString(),
            });
          });
        }

        setRecentActivity(activities.slice(0, 5));
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to load dashboard data. Please try again.");

        // Fallback to basic user data if available
        try {
          const basicProfileRes = await userApi.get("/user/profile");
          setUserData(basicProfileRes.data);
        } catch (profileError) {
          console.error("Error fetching basic profile:", profileError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black font-poppins">
        <ReactLenis
          root
          options={{
            lerp: 0.2,
            duration: 1,
            wheelMultiplier: 2.5,
            smoothWheel: true,
            smoothTouch: true,
          }}
        />
        <div className="p-8 text-white flex items-center justify-center min-h-screen">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"
          />
          <span className="ml-4 text-xl">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !userData) {
    return (
      <div className="min-h-screen bg-black font-poppins">
        <ReactLenis
          root
          options={{
            lerp: 0.2,
            duration: 1,
            wheelMultiplier: 2.5,
            smoothWheel: true,
            smoothTouch: true,
          }}
        />
        <div className="p-8 text-white flex flex-col items-center justify-center min-h-screen">
          <div className="text-red-400 text-xl mb-4">⚠️ {error}</div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.reload()}
            className="bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-6 rounded-xl font-medium transition-colors"
          >
            Retry
          </motion.button>
        </div>
      </div>
    );
  }

  const profilePhoto = userData?.profileImageUrl || userData?.profilePhoto?.url;

  return (
    <div className="min-h-screen bg-black font-poppins">
      <ReactLenis
        root
        options={{
          lerp: 0.2,
          duration: 1,
          wheelMultiplier: 2.5,
          smoothWheel: true,
          smoothTouch: true,
        }}
      />

      <div className="container mx-auto px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                {profilePhoto ? (
                  <motion.img
                    whileHover={{ scale: 1.05 }}
                    src={profilePhoto}
                    alt="Profile photo"
                    className="w-20 h-20 rounded-full object-cover border-2 border-cyan-400"
                  />
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-200 to-cyan-300 flex items-center justify-center text-black font-bold text-2xl"
                  >
                    {userData?.username?.charAt(0).toUpperCase() || "U"}
                  </motion.div>
                )}
                <div>
                  <h1 className="text-5xl font-semibold text-white mb-2">
                    Welcome back, {userData?.username || "Student"}!
                  </h1>
                  <p className="text-gray-400 text-xl">
                    Ready to continue your learning journey?
                  </p>
                </div>
              </div>

              <motion.button
                onClick={() => setExploreOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-br from-cyan-200 to-cyan-300 text-black font-semibold py-3 px-6 rounded-2xl hover:opacity-90 transition"
              >
                Explore Subjects
              </motion.button>
            </div>
          </motion.div>

          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-900/50 border border-yellow-600 rounded-2xl p-4 mb-8"
            >
              <p className="text-yellow-200">⚠️ {error}</p>
            </motion.div>
          )}

          {/* Progress Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12"
          >
            {[
              {
                label: "Enrolled Courses",
                value: progressStats.totalCourses,
                icon: "📚",
              },
              {
                label: "Completed",
                value: progressStats.completedCourses,
                icon: "✅",
              },
              {
                label: "Study Hours",
                value: `${progressStats.totalHours}h`,
                icon: "⏰",
              },
              {
                label: "Learning Streak",
                value: `${progressStats.streakDays} days`,
                icon: "🔥",
              },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                whileHover={{ scale: 1.02 }}
                className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6 hover:border-cyan-500/50 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{stat.icon}</span>
                  <span className="text-3xl font-bold text-white">
                    {stat.value}
                  </span>
                </div>
                <p className="text-gray-400">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Continue Learning Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-semibold text-white mb-6">
              Continue Learning
            </h2>
            {enrolledCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map((course, index) => (
                  <motion.div
                    key={course._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gray-900/50 border border-gray-700 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition-all duration-300 cursor-pointer"
                    onClick={() => navigate(`/course/${course._id}`)}
                  >
                    {/* Course Thumbnail */}
                    <div className="aspect-video bg-gray-800 relative overflow-hidden">
                      {course.thumbnail?.url ? (
                        <img
                          src={course.thumbnail.url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-800 to-gray-900">
                          <svg
                            className="w-12 h-12"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-lg text-sm">
                        {course.category}
                      </div>
                    </div>

                    {/* Course Info */}
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {course.title}
                      </h3>
                      <p className="text-gray-400 text-sm mb-4">
                        {course.completedLessons}/{course.totalLessons} lessons
                        completed
                      </p>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-400">
                            Progress
                          </span>
                          <span className="text-sm text-cyan-400 font-medium">
                            {course.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${course.progress}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="bg-gradient-to-r from-cyan-400 to-cyan-300 h-2 rounded-full"
                          />
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-4 rounded-xl font-medium transition-colors"
                      >
                        Continue Learning
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gray-900/50 border border-gray-700 rounded-2xl p-8 text-center"
              >
                <div className="text-gray-400 text-lg mb-4">
                  📚 No enrolled courses yet
                </div>
                <p className="text-gray-500 mb-6">
                  Start your learning journey by exploring our subjects
                </p>
                <motion.button
                  onClick={() => setExploreOpen(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-br from-cyan-200 to-cyan-300 text-black font-semibold py-2 px-6 rounded-xl"
                >
                  Browse Subjects
                </motion.button>
              </motion.div>
            )}
          </motion.div>

          {/* Recent Activity & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6"
            >
              <h3 className="text-2xl font-semibold text-white mb-6">
                Recent Activity
              </h3>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 * index }}
                      className="flex items-start space-x-3 p-3 rounded-xl hover:bg-gray-800/50 transition-colors"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          activity.type === "completed"
                            ? "bg-green-400"
                            : activity.type === "started"
                            ? "bg-blue-400"
                            : "bg-yellow-400"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-white">{activity.content}</p>
                        <p className="text-gray-400 text-sm">{activity.time}</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-gray-400 text-center py-8">
                    No recent activity yet. Start learning to see your progress
                    here!
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6"
            >
              <h3 className="text-2xl font-semibold text-white mb-6">
                Quick Actions
              </h3>
              <div className="space-y-4">
                {[
                  {
                    title: "Browse All Subjects",
                    desc: "Explore our comprehensive curriculum",
                    icon: "🔍",
                    action: () => navigate("/explore-courses"),
                  },
                  {
                    title: "Practice Tests",
                    desc: "Test your knowledge with quizzes",
                    icon: "📝",
                    action: () => console.log("Practice tests"),
                  },
                  {
                    title: "Study Groups",
                    desc: "Join or create study groups",
                    icon: "👥",
                    action: () => console.log("Study groups"),
                  },
                  {
                    title: "Download for Offline",
                    desc: "Save lessons for offline study",
                    icon: "📱",
                    action: () => console.log("Offline download"),
                  },
                ].map((action, index) => (
                  <motion.button
                    key={action.title}
                    onClick={action.action}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full text-left p-4 rounded-xl border border-gray-600 hover:border-cyan-500/50 hover:bg-gray-800/50 transition-all duration-300"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{action.icon}</span>
                      <div>
                        <h4 className="text-white font-medium">
                          {action.title}
                        </h4>
                        <p className="text-gray-400 text-sm">{action.desc}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
