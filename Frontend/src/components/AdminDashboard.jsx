import React, { useState, useEffect } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import adminApi from "../api/adminApi"; // Use the dedicated adminApi instance
import Lenis from "lenis";

const AdminDashboard = () => {
  const { admin, adminLogout, adminToken } = useAdminAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    courseId: null,
    courseName: "",
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: "vertical",
      gestureDirection: "vertical",
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        // Use the authenticated adminApi instance
        const response = await adminApi.get("/admin/courses");
        setCourses(response.data.courses || []);
      } catch (err) {
        setError("Failed to fetch courses. Please try again later.");
        console.error("Error fetching courses:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleLogout = () => {
    adminLogout();
    navigate("/loginadmin");
  };

  const handleDeleteCourse = (courseId, courseName) => {
    setDeleteConfirm({ show: true, courseId, courseName });
  };

  const handleConfirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await adminApi.delete(`/admin/courses/${deleteConfirm.courseId}`);
      setCourses(
        courses.filter((course) => course._id !== deleteConfirm.courseId)
      );
      setDeleteConfirm({ show: false, courseId: null, courseName: "" });
    } catch (err) {
      setError("Failed to delete course. Please try again later.");
      console.error("Error deleting course:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ show: false, courseId: null, courseName: "" });
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Admin Dashboard
              </h1>
              <p className="text-gray-400">
                Welcome back, {admin?.username || admin?.email}!
              </p>
            </div>
            <Link
              to="/admin/create-course"
              className="bg-gradient-to-br from-cyan-200 to-cyan-300 text-black font-semibold py-2 px-4 rounded-2xl hover:opacity-90 transition"
            >
              Create New Course
            </Link>
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-2xl transition-colors"
            >
              Logout
            </motion.button>
          </div>

          {/* Admin Info Card */}
          <div className="bg-black border border-gray-700 rounded-2xl p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Admin Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400">Email</p>
                <p className="text-white font-medium">{admin?.email}</p>
              </div>
              <div>
                <p className="text-gray-400">Username</p>
                <p className="text-white font-medium">
                  {admin?.username || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Manage Courses Section */}
          <div className="bg-black border border-gray-700 rounded-2xl p-6 mt-8">
            <h2 className="text-2xl font-semibold mb-6">Manage Courses</h2>
            {loading ? (
              <p>Loading courses...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : courses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {courses.map((course) => (
                  <motion.div
                    key={course._id}
                    whileHover={{ scale: 1 }}
                    className="bg-gray-900/50 border border-gray-700 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition-all duration-300"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-gray-800 relative overflow-hidden">
                      {course.thumbnail?.url ? (
                        <img
                          src={course.thumbnail.url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
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
                    </div>

                    {/* Card Content */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-gray-400 text-sm mb-3">
                        Created:{" "}
                        {new Date(course.createdAt).toLocaleDateString()}
                      </p>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <Link
                          to={`/admin/course/manage/${course._id}`}
                          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit Course
                        </Link>
                        <Link
                          to={`/admin/course/manage/${course._id}#upload`}
                          className="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          Upload Video
                        </Link>
                        <motion.button
                          onClick={() =>
                            handleDeleteCourse(course._id, course.title)
                          }
                          whileHover={{ scale: 1 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete Course
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">
                No courses found. Create one to get started!
              </p>
            )}
          </div>

          {/* Quick Actions - Example for creating a course */}
          <div className="mt-8 border-[1px] border-gray-600 p-5 rounded-2xl">
            <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
            <div className="flex ">
              <span className="text-xl mt-1 mr-5">
                In order to create now course click on the button :{" "}
              </span>
              <motion.div
                whileHover={{ scale: 1 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-br from-cyan-200 to-cyan-300 text-black rounded-2xl p-1 cursor-pointer w-[20%] items-center"
                onClick={() => navigate("/admin/create-course")} // Assuming you have a route for this
              >
                <h3 className="text-xl text-center">Create New Course</h3>
              </motion.div>
            </div>
          </div>
          {/* Recent Activity */}
          <div className="bg-black border border-gray-700 rounded-2xl p-6 mt-8">
            <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {courses.length > 0 && (
                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-300">Total Courses</span>
                  <span className="text-cyan-400 font-medium">
                    {courses.length} course{courses.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-gray-800">
                <span className="text-gray-300">Videos Uploaded</span>
                <span className="text-cyan-400 font-medium">
                  {courses.reduce(
                    (total, course) =>
                      total + (course.videoLectures?.length || 0),
                    0
                  )}{" "}
                  video
                  {courses.reduce(
                    (total, course) =>
                      total + (course.videoLectures?.length || 0),
                    0
                  ) !== 1
                    ? "s"
                    : ""}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-800">
                <span className="text-gray-300">System Status</span>
                <span className="text-green-400 font-medium">
                  All systems operational
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-800">
                <span className="text-gray-300">Last Login</span>
                <span className="text-gray-400">Just now</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {deleteConfirm.show && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-black border border-gray-700 rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-4">
              Confirm Delete Course: {deleteConfirm.courseName}
            </h2>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete this course? This action is
              irreversible.
            </p>
            <div className="flex space-x-4">
              <motion.button
                onClick={handleConfirmDelete}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-2xl transition-colors"
              >
                Delete
              </motion.button>
              <motion.button
                onClick={handleCancelDelete}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-2xl transition-colors"
              >
                Cancel
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
