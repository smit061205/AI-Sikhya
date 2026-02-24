import React, { useEffect, useState } from "react";
import { useExploreDropdown } from "../context/ExploreDropdownContext";
import { motion, AnimatePresence } from "framer-motion";
import { ReactLenis } from "lenis/react";
import userApi from "../api/userApi";
import { useNavigate, Link } from "react-router-dom";
import Chatbot from "./Chatbot";

/* ─── animation preset ─────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: "easeOut" },
});

/* ─── Stat Card ────────────────────────────────────── */
const StatCard = ({ label, value, icon, delay }) => (
  <motion.div
    {...fadeUp(delay)}
    className="bg-[#111318] border border-[#222530] rounded-xl p-5 flex items-center gap-4"
  >
    <div className="w-10 h-10 rounded-lg bg-[#1a1d27] flex items-center justify-center text-xl flex-shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
    </div>
  </motion.div>
);

/* ════════════════════════════════════════════════════
   Main Component
════════════════════════════════════════════════════ */
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
  const [showAI, setShowAI] = useState(false);
  const { setExploreOpen } = useExploreDropdown();
  const navigate = useNavigate();

  // Lock page scroll when AI modal is open
  useEffect(() => {
    document.body.style.overflow = showAI ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showAI]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        const profileRes = await userApi.get("/user/profile");
        setUserData(profileRes.data);

        const progressRes = await userApi.get("/user/progress");
        const d = progressRes.data;

        const courses =
          d.progressRecords?.map((r) => ({
            _id: r.course._id,
            title: r.course.title,
            thumbnail: r.course.thumbnail,
            progress: Math.round(r.overallProgress),
            totalLessons: r.totalVideos,
            completedLessons: r.completedVideos,
            category: r.course.category || "General",
            lastAccessed: r.lastAccessedAt,
          })) || [];

        setEnrolledCourses(courses);
        setProgressStats({
          totalCourses: d.totalCourses || 0,
          completedCourses: d.completedCourses || 0,
          totalHours: Math.round(
            (d.progressRecords?.reduce(
              (t, r) => t + (r.totalWatchTime || 0),
              0,
            ) || 0) / 3600,
          ),
          streakDays: 0,
        });

        // Build real activity from progressRecords sorted by lastAccessedAt
        const acts = [];
        const sortedRecords = [...(d.progressRecords || [])].sort(
          (a, b) => new Date(b.lastAccessedAt) - new Date(a.lastAccessedAt),
        );
        sortedRecords.forEach((r) => {
          if (!r.course?.title) return;
          const date = r.lastAccessedAt
            ? new Date(r.lastAccessedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : null;
          const completedVids =
            r.videosProgress?.filter((v) => v.isCompleted).length || 0;
          if (r.isCompleted) {
            acts.push({
              type: "completed",
              icon: "✅",
              content: `Completed "${r.course.title}"`,
              time: date,
            });
          } else if (r.overallProgress > 0) {
            acts.push({
              type: "inprogress",
              icon: "▶️",
              content: `${Math.round(r.overallProgress)}% through "${r.course.title}"`,
              sub:
                completedVids > 0
                  ? `${completedVids} of ${r.totalVideos} lessons watched`
                  : null,
              time: date,
            });
          }
        });
        setRecentActivity(acts.slice(0, 6));
      } catch (err) {
        console.error(err);
        setError("Could not load all data.");
        try {
          const p = await userApi.get("/user/profile");
          setUserData(p.data);
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0e14] flex items-center justify-center font-poppins">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"
        />
        <span className="ml-3 text-gray-500 text-sm">Loading…</span>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="min-h-screen bg-[#0c0e14] flex flex-col items-center justify-center font-poppins">
        <p className="text-red-400 mb-4 text-sm">⚠️ {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-cyan-400 border border-cyan-400/30 py-2 px-5 rounded-lg hover:bg-cyan-400/10 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const profilePhoto = userData?.profileImageUrl || userData?.profilePhoto?.url;
  const username = userData?.username || "Student";

  const stats = [
    {
      label: "Enrolled Courses",
      value: progressStats.totalCourses,
      icon: "📚",
      delay: 0.05,
    },
    {
      label: "Completed",
      value: progressStats.completedCourses,
      icon: "✅",
      delay: 0.1,
    },
    {
      label: "Study Hours",
      value: `${progressStats.totalHours}h`,
      icon: "⏱",
      delay: 0.15,
    },
    {
      label: "Day Streak",
      value: progressStats.streakDays,
      icon: "🔥",
      delay: 0.2,
    },
  ];

  const quickActions = [
    {
      title: "Browse Subjects",
      desc: "Explore all available courses",
      icon: "🔍",
      action: () => navigate("/explore-courses"),
      comingSoon: false,
    },
    {
      title: "AI Sahayak",
      desc: "Ask anything — your AI study assistant",
      icon: "🤖",
      action: () => setShowAI(true),
      comingSoon: false,
      highlight: true,
    },
    {
      title: "Practice Tests",
      desc: "Quiz your knowledge",
      icon: "📝",
      action: () => {},
      comingSoon: true,
    },
    {
      title: "Study Groups",
      desc: "Learn with others",
      icon: "👥",
      action: () => {},
      comingSoon: true,
    },
    {
      title: "Offline App",
      desc: "Save content for later",
      icon: "📲",
      action: () => {},
      comingSoon: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0c0e14] font-poppins text-white">
      <ReactLenis
        root
        options={{
          lerp: 0.2,
          duration: 1,
          wheelMultiplier: 2.5,
          smoothWheel: true,
        }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 space-y-8">
        {/* ── HEADER ── */}
        <motion.div
          {...fadeUp(0)}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Profile"
                className="w-12 h-12 rounded-full object-cover border border-[#2a2d3a]"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center text-black font-bold text-lg">
                {username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold text-white">
                Welcome back, {username}
              </h1>
              <p className="text-gray-500 text-sm">
                Ready to learn something new?
              </p>
            </div>
          </div>
          <motion.button
            onClick={() => setExploreOpen(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-2.5 px-5 rounded-lg text-sm transition-colors"
          >
            Explore Subjects
          </motion.button>
        </motion.div>

        {/* ── ERROR BANNER ── */}
        {error && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3 text-yellow-400 text-sm">
            ⚠️ {error} — showing partial data.
          </div>
        )}

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* ── CONTINUE LEARNING ── */}
        <motion.section {...fadeUp(0.15)}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">
              Continue Learning
            </h2>
            <Link
              to="/explore-courses"
              className="text-cyan-400 text-sm hover:underline"
            >
              Browse more →
            </Link>
          </div>

          {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {enrolledCourses.map((course, i) => (
                <motion.div
                  key={course._id}
                  {...fadeUp(0.05 * i)}
                  whileHover={{ y: -3 }}
                  onClick={() => navigate(`/course/${course._id}`)}
                  className="bg-[#111318] border border-[#222530] rounded-xl overflow-hidden cursor-pointer hover:border-[#3a3d4a] transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-[#1a1d27] relative overflow-hidden">
                    {course.thumbnail?.url ? (
                      <img
                        src={course.thumbnail.url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <svg
                          className="w-10 h-10"
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
                    <span className="absolute bottom-2 left-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                      {course.category}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-white text-sm font-semibold leading-snug line-clamp-1 mb-1">
                      {course.title}
                    </h3>
                    <p className="text-gray-500 text-xs mb-3">
                      {course.completedLessons}/{course.totalLessons} lessons
                      completed
                    </p>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="text-cyan-400 font-medium">
                          {course.progress}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#1a1d27] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${course.progress}%` }}
                          transition={{ duration: 0.9, delay: 0.3 }}
                          className="h-full bg-cyan-500 rounded-full"
                        />
                      </div>
                    </div>

                    <button className="w-full py-2 rounded-lg text-xs font-semibold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10 transition-colors">
                      Continue Learning
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-[#111318] border border-[#222530] rounded-xl p-10 text-center">
              <p className="text-2xl mb-3">📚</p>
              <p className="text-gray-400 text-sm mb-1">
                No enrolled courses yet
              </p>
              <p className="text-gray-600 text-xs mb-5">
                Browse subjects to get started
              </p>
              <button
                onClick={() => setExploreOpen(true)}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-2 px-5 rounded-lg text-sm transition-colors"
              >
                Browse Subjects
              </button>
            </div>
          )}
        </motion.section>

        {/* ── ACTIVITY + QUICK ACTIONS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <motion.div
            {...fadeUp(0.2)}
            className="bg-[#111318] border border-[#222530] rounded-xl p-6"
          >
            <h3 className="text-sm font-semibold text-white mb-5">
              Recent Activity
            </h3>
            {recentActivity.length > 0 ? (
              <div className="divide-y divide-[#1e2130]">
                {recentActivity.map((act, i) => (
                  <div key={i} className="flex items-start gap-3 py-3">
                    <div className="text-base mt-0.5 flex-shrink-0">
                      {act.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">
                        {act.content}
                      </p>
                      {act.sub && (
                        <p className="text-cyan-400 text-[11px] mt-0.5">
                          {act.sub}
                        </p>
                      )}
                      <p className="text-gray-500 text-xs mt-0.5">{act.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600 text-sm">
                No activity yet — start a course!
              </div>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            {...fadeUp(0.25)}
            className="bg-[#111318] border border-[#222530] rounded-xl p-6"
          >
            <h3 className="text-sm font-semibold text-white mb-5">
              Quick Actions
            </h3>
            <div className="space-y-2">
              {quickActions.map((qa) => (
                <button
                  key={qa.title}
                  onClick={qa.comingSoon ? undefined : qa.action}
                  disabled={qa.comingSoon}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-all group ${
                    qa.comingSoon
                      ? "border-transparent opacity-50 cursor-not-allowed"
                      : qa.highlight
                        ? "border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/40"
                        : "border-transparent hover:bg-[#1a1d27] hover:border-[#2a2d3a]"
                  }`}
                >
                  <span className="text-lg w-7 flex-shrink-0">{qa.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-medium ${qa.highlight ? "text-cyan-300" : "text-white"}`}
                      >
                        {qa.title}
                      </p>
                      {qa.comingSoon && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider bg-[#1a1d27] border border-[#2a2d3a] text-gray-500 px-1.5 py-0.5 rounded-full">
                          Soon
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs">{qa.desc}</p>
                  </div>
                  {!qa.comingSoon && (
                    <span
                      className={`transition-colors text-sm ${qa.highlight ? "text-cyan-500 group-hover:text-cyan-400" : "text-gray-700 group-hover:text-gray-400"}`}
                    >
                      →
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="h-8" />
      </div>

      {/* ── AI Chat Modal ── */}
      <AnimatePresence>
        {showAI && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAI(false);
            }}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="w-full max-w-lg h-[70vh] bg-[#111318] border border-[#222530] rounded-2xl flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#222530] flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-black">AI</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">
                      Sahayak AI
                    </p>
                    <p className="text-gray-600 text-xs">Ask me anything</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAI(false)}
                  className="w-7 h-7 rounded-lg bg-[#1a1d27] border border-[#222530] flex items-center justify-center text-gray-500 hover:text-white transition-colors text-sm"
                >
                  ✕
                </button>
              </div>
              {/* Chat content */}
              <div className="flex-1 overflow-hidden">
                <Chatbot video={null} transcriptData={[]} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserDashboard;
