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
  ChevronLeftIcon,
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
      stars.push(<StarSolidIcon key={i} className="h-4 w-4 text-yellow-400" />);
    }
    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative">
          <StarIcon className="h-4 w-4 text-yellow-400" />
          <StarSolidIcon className="h-4 w-4 text-yellow-400 absolute top-0 left-0 clip-path-half" />
        </div>,
      );
    }
    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <StarIcon key={`empty-${i}`} className="h-4 w-4 text-gray-600" />,
      );
    }
    return stars;
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0e14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#222530] border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-gray-600 text-sm">Loading course…</p>
        </div>
      </div>
    );
  }

  /* ─── Error ─── */
  if (error) {
    return (
      <div className="min-h-screen bg-[#0c0e14] flex items-center justify-center">
        <div className="bg-[#111318] border border-[#222530] rounded-2xl p-10 text-center max-w-sm">
          <XIcon className="h-10 w-10 text-red-500/70 mx-auto mb-4" />
          <p className="text-red-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate("/explore-courses")}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  /* ─── Not found ─── */
  if (!course) {
    return (
      <div className="min-h-screen bg-[#0c0e14] flex items-center justify-center">
        <div className="bg-[#111318] border border-[#222530] rounded-2xl p-10 text-center max-w-sm">
          <BookOpenIcon className="h-10 w-10 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 text-sm mb-6">Course not found</p>
          <button
            onClick={() => navigate("/explore-courses")}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
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
    <div className="min-h-screen bg-[#0c0e14] text-white">
      {/* ── Hero Card ── */}
      <div className="border-b border-[#222530]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <motion.button
            onClick={() => navigate("/explore-courses")}
            whileHover={{ x: -3 }}
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-300 text-sm mb-8 transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Back to courses
          </motion.button>

          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Category badge */}
              <span className="inline-block bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 px-3 py-1 rounded-full text-xs font-semibold mb-5">
                {course.category}
              </span>

              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
                {course.title}
              </h1>

              <p className="text-gray-500 text-sm leading-relaxed mb-7">
                {course.description}
              </p>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-5 mb-7 text-sm">
                {course.enrolledCount > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex">
                      {renderStars(course.rating || 0)}
                    </div>
                    <span className="text-gray-500 ml-1">
                      {course.rating || 0} · {course.enrolledCount} students
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-600">
                    No ratings · {course.enrolledCount || 0} students
                  </span>
                )}

                <div className="flex items-center gap-1.5 text-gray-600">
                  <ClockIcon className="h-4 w-4" />
                  <span>{course.duration || "Self-paced"}</span>
                </div>

                <div className="flex items-center gap-1.5 text-gray-600">
                  <BookOpenIcon className="h-4 w-4" />
                  <span>{videos.length} videos</span>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-8">
                <span className="text-2xl font-bold text-cyan-400">
                  {course.price === 0 ? "Free" : `₹${course.price}`}
                </span>
                {course.originalPrice &&
                  course.originalPrice > course.price && (
                    <span className="text-gray-600 line-through text-base">
                      ₹{course.originalPrice}
                    </span>
                  )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 flex-wrap">
                {isEnrolled ? (
                  <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/25 text-green-400 px-5 py-2.5 rounded-xl text-sm font-semibold">
                    <CheckCircleIcon className="h-4 w-4" />
                    Enrolled
                  </div>
                ) : (
                  <motion.button
                    onClick={handleEnrollment}
                    disabled={enrolling}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-7 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {enrolling
                      ? "Enrolling…"
                      : course.price === 0
                        ? "Enroll for Free"
                        : `Enroll · ₹${course.price}`}
                  </motion.button>
                )}
              </div>
            </motion.div>

            {/* Thumbnail */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <div className="aspect-video bg-[#111318] border border-[#222530] rounded-2xl overflow-hidden relative group shadow-2xl">
                {course.thumbnail?.url ? (
                  <img
                    src={course.thumbnail.url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PlayIcon className="h-14 w-14 text-gray-700" />
                  </div>
                )}

                {videos.length > 0 && (
                  <motion.button
                    onClick={() => handleVideoClick(videos[0])}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30">
                      <PlayIcon className="h-7 w-7 text-black ml-1" />
                    </div>
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Course Content ── */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white">Course Content</h2>
            <span className="text-gray-600 text-sm">
              {videos.length} lessons
            </span>
          </div>

          {videos.length > 0 ? (
            <div className="space-y-3 max-w-4xl">
              {videos.map((video, index) => (
                <motion.div
                  key={video._id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.06 }}
                  whileHover={{ scale: 1.005 }}
                  onClick={() => handleVideoClick(video)}
                  className="group bg-[#111318] border border-[#222530] hover:border-cyan-500/30 rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all"
                >
                  {/* Number badge */}
                  <div className="w-9 h-9 rounded-lg bg-[#0c0e14] border border-[#222530] group-hover:border-cyan-500/30 flex items-center justify-center text-sm font-semibold text-gray-600 group-hover:text-cyan-400 transition-colors flex-shrink-0">
                    {index + 1}
                  </div>

                  {/* Thumbnail */}
                  <div className="w-28 h-16 bg-[#0c0e14] border border-[#222530] rounded-lg overflow-hidden relative flex-shrink-0">
                    {video.thumbnail?.url ? (
                      <img
                        src={video.thumbnail.url}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PlayIcon className="h-5 w-5 text-gray-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                      <div className="w-7 h-7 bg-cyan-500/90 group-hover:bg-cyan-400 rounded-full flex items-center justify-center transition-colors">
                        <PlayIcon className="h-3 w-3 text-black ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white group-hover:text-cyan-100 transition-colors truncate mb-1">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-gray-600 text-xs line-clamp-1 mb-1.5">
                        {video.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-gray-700 text-xs">
                      <ClockIcon className="h-3.5 w-3.5" />
                      <span>{video.duration || "N/A"}</span>
                    </div>
                  </div>

                  {/* Play CTA */}
                  <div className="hidden group-hover:flex items-center gap-1.5 text-cyan-400 text-xs font-semibold flex-shrink-0 pr-1">
                    Watch <PlayIcon className="h-3.5 w-3.5" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#111318] border border-[#222530] flex items-center justify-center mb-4">
                <BookOpenIcon className="h-7 w-7 text-gray-700" />
              </div>
              <p className="text-gray-600 text-sm">No videos available yet</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Video Player Modal ── */}
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
