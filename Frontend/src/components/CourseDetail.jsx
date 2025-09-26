import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PlayIcon,
  StarIcon,
  ClockIcon,
  UserGroupIcon,
  BookOpenIcon,
  CheckCircleIcon,
  XIcon,
} from "@heroicons/react/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/solid";
import VideoPlayer from "./VideoPlayer";
import userApi from "../api/userApi";

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  useEffect(() => {
    fetchCourseDetails();
    checkEnrollmentStatus();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const response = await userApi.get(`/course/${courseId}`);
      setCourse(response.data.course);
      setVideos(response.data.videos || []);
    } catch (err) {
      console.error("Error fetching course details:", err);
      setError("Failed to load course details");
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollmentStatus = async () => {
    try {
      setIsEnrolled(true);
    } catch (err) {
      console.error("Error checking enrollment:", err);
      setIsEnrolled(true);
    }
  };

  const handleEnrollment = async () => {
    try {
      setEnrolling(true);
      await userApi.post(`/courses/${courseId}/enroll`);
      setIsEnrolled(true);
    } catch (err) {
      console.error("Error enrolling in course:", err);
      setError("Failed to enroll in course");
    } finally {
      setEnrolling(false);
    }
  };

  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    setShowVideoPlayer(true);
  };

  const handleCloseVideoPlayer = () => {
    setShowVideoPlayer(false);
    setSelectedVideo(null);
  };

  const handleNextVideo = () => {
    const currentIndex = videos.findIndex((v) => v._id === selectedVideo._id);
    if (currentIndex < videos.length - 1) {
      setSelectedVideo(videos[currentIndex + 1]);
    }
  };

  const handlePreviousVideo = () => {
    const currentIndex = videos.findIndex((v) => v._id === selectedVideo._id);
    if (currentIndex > 0) {
      setSelectedVideo(videos[currentIndex - 1]);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<StarSolidIcon key={i} className="h-5 w-5 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative">
          <StarIcon className="h-5 w-5 text-yellow-400" />
          <StarSolidIcon className="h-5 w-5 text-yellow-400 absolute top-0 left-0 clip-path-half" />
        </div>
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <StarIcon key={`empty-${i}`} className="h-5 w-5 text-gray-400" />
      );
    }

    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <XIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate("/explore-courses")}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300">Course not found</p>
          <button
            onClick={() => navigate("/explore-courses")}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg transition-colors mt-4"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  const currentVideoIndex = selectedVideo
    ? videos.findIndex((v) => v._id === selectedVideo._id)
    : -1;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="container mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Course Info */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-4">
                <span className="bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full text-sm font-medium">
                  {course.category}
                </span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {course.title}
              </h1>

              <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                {course.description}
              </p>

              {/* Course Stats */}
              <div className="flex flex-wrap gap-6 mb-8">
                <div className="flex items-center gap-2">
                  {course.enrolledCount > 0 ? (
                    <>
                      {renderStars(course.rating || 0)}
                      <span className="text-gray-300 ml-2">
                        ({course.rating || 0}) • {course.enrolledCount} students
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400">
                      No ratings yet • {course.enrolledCount || 0} students
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-gray-300">
                  <ClockIcon className="h-5 w-5" />
                  <span>{course.duration || "Self-paced"}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-300">
                  <BookOpenIcon className="h-5 w-5" />
                  <span>{videos.length} videos</span>
                </div>
              </div>

              {/* Price and Enrollment */}
              <div className="flex items-center gap-4 mb-8">
                <div className="text-xl font-semibold text-cyan-400">
                  {course.price === 0 ? "Free" : `₹${course.price}`}
                </div>
                {course.originalPrice &&
                  course.originalPrice > course.price && (
                    <div className="text-gray-400 line-through text-lg">
                      ₹{course.originalPrice}
                    </div>
                  )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                {isEnrolled ? (
                  <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-6 py-3 rounded-xl">
                    <CheckCircleIcon className="h-5 w-5" />
                    <span className="font-semibold">Enrolled</span>
                  </div>
                ) : (
                  <motion.button
                    onClick={handleEnrollment}
                    disabled={enrolling}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {enrolling
                      ? "Enrolling..."
                      : course.price === 0
                      ? "Enroll for Free"
                      : `Enroll for ₹${course.price}`}
                  </motion.button>
                )}

                <motion.button
                  onClick={() => navigate("/explore-courses")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="border border-gray-600 hover:border-gray-500 text-white px-8 py-3 rounded-xl font-semibold transition-all"
                >
                  Back to Courses
                </motion.button>
              </div>
            </motion.div>

            {/* Course Thumbnail */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-video bg-gray-800 rounded-2xl overflow-hidden relative group">
                {course.thumbnail?.url ? (
                  <img
                    src={course.thumbnail.url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PlayIcon className="h-16 w-16 text-gray-400" />
                  </div>
                )}

                {videos.length > 0 && (
                  <motion.button
                    onClick={() => handleVideoClick(videos[0])}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="bg-cyan-500 rounded-full p-4">
                      <PlayIcon className="h-8 w-8 text-white ml-1" />
                    </div>
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="container mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-3xl font-bold mb-8 text-center">
            Course Content
          </h2>

          {videos.length > 0 ? (
            <div className="grid gap-4 max-w-4xl mx-auto">
              {videos.map((video, index) => (
                <motion.div
                  key={video._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ scale: 1.01 }}
                  className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all cursor-pointer"
                  onClick={() => handleVideoClick(video)}
                >
                  <div className="flex items-center gap-4">
                    {/* Video Thumbnail */}
                    <div className="relative flex-shrink-0">
                      <div className="w-32 h-18 bg-gray-800 rounded-lg overflow-hidden relative group">
                        {video.thumbnail?.url ? (
                          <img
                            src={video.thumbnail.url}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PlayIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}

                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="bg-cyan-500/80 rounded-full p-2">
                            <PlayIcon className="h-4 w-4 text-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Video Info */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {index + 1}. {video.title}
                      </h3>
                      {video.description && (
                        <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                          {video.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          {video.duration || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpenIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">
                No videos available for this course yet.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Video Player Modal */}
      {showVideoPlayer && selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          onClose={handleCloseVideoPlayer}
          onNext={
            currentVideoIndex < videos.length - 1 ? handleNextVideo : null
          }
          onPrevious={currentVideoIndex > 0 ? handlePreviousVideo : null}
          hasNext={currentVideoIndex < videos.length - 1}
          hasPrevious={currentVideoIndex > 0}
          courseTitle={course.title}
        />
      )}
    </div>
  );
};

export default CourseDetail;
