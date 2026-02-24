// Animation variants for staggered course cards in Explore dropdown
const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};
const itemVariants = {
  initial: { y: 1, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.2 } },
  exit: { y: 1, opacity: 0 },
};
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useExploreDropdown } from "../context/ExploreDropdownContext"; // Import the context hook
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { IoIosSearch } from "react-icons/io";
import { IoCartOutline } from "react-icons/io5";
import { FaRegHeart } from "react-icons/fa";
import { FaRegBell } from "react-icons/fa"; // Corrected icon library
import axios from "axios";
import { IoCloseOutline } from "react-icons/io5";
import { IoIosArrowRoundForward } from "react-icons/io";
const NavbarUser = () => {
  const { user, logout } = useAuth();
  const { isExploreOpen, setExploreOpen } = useExploreDropdown();
  const navigate = useNavigate();
  const [profilePicture, setProfilePicture] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [instructors, setInstructors] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const HandleLogout = () => {
    localStorage.removeItem("token");
    logout();
    navigate("/");
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Get token from localStorage
        const token = localStorage.getItem("token");

        if (!token) {
          console.error("❌ No token found in localStorage");
          return;
        }

        // Use axios - interceptor will automatically add Authorization header
        const response = await axios.get("/user/profile");

        console.log("📸 Frontend Profile Image Debug:");
        console.log("profileImageUrl:", response.data.profileImageUrl);
        console.log("profilePicture:", response.data.profilePicture);
        console.log("profilePhotoUrl:", response.data.profilePhoto?.url);
        console.log("Full response data:", response.data);

        // Use unified field first, fallback to old fields
        const imageUrl =
          response.data.profileImageUrl ||
          response.data.profilePicture ||
          response.data.profilePhoto?.url;

        console.log("🖼️ Final image URL selected:", imageUrl);
        setProfilePicture(imageUrl);
      } catch (error) {
        console.error("Profile fetch error:", error);

        // If token is invalid, logout user
        if (error.response?.status === 401) {
          console.log("🔐 Token expired or invalid, logging out...");
          HandleLogout();
        }
      }
    };

    fetchProfile();
  }, []);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      // Format time as HH:MM:SS (24-hour)
      const formattedTime = [
        hours.toString().padStart(2, "0"),
        minutes.toString().padStart(2, "0"),
        seconds.toString().padStart(2, "0"),
      ].join(":");

      setCurrentTime(formattedTime);
    };

    updateTime(); // initialize immediately

    const intervalId = setInterval(updateTime, 1000); // update every second

    return () => clearInterval(intervalId); // cleanup on unmount
  }, []);
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
          }/courses`,
        );
        const data = await response.json();
        setCourses(data.courses || []);
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      }
    };

    const fetchInstructors = async () => {
      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
          }/admin/instructors`,
        );
        const data = await response.json();
        setInstructors(data.instructors || []);
      } catch (error) {
        console.error("Failed to fetch instructors:", error);
      }
    };

    fetchCourses();
    fetchInstructors();
  }, []);
  const categories = [
    "Javascript",
    "Python",
    "React",
    "Backend",
    "Data science",
    "Machine Learning",
  ];

  const filteredCourses =
    selectedCategory === "All"
      ? courses
      : courses.filter((course) => course.category === selectedCategory);
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest(".relative")) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <div className="pt-1 h-18 border-b-[0.5px] border-b-gray-600 flex flex-row justify-between items-center bg-black px-8">
      {/* Left side - Logo */}
      <div className="flex items-center flex-shrink-0">
        <Link to={"/user-dashboard"}>
          <div className="transform scale-85">
            <Logo />
          </div>
        </Link>
      </div>

      {/* Center section - Navigation and Search */}
      <div className="flex items-center space-x-4 flex-1 justify-center">
        <div className="flex items-center space-x-4">
          <div
            className="relative"
            onMouseEnter={() => setExploreOpen(true)} // Use shared state setter
            onMouseLeave={() => setExploreOpen(false)} // Use shared state setter
          >
            <Link
              to="/explore-courses"
              className="text-white text-xl mr-4 hover:text-cyan-300 transition-colors"
            >
              Explore
            </Link>
            <AnimatePresence>
              {isExploreOpen && ( // Use shared state
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="fixed top-0 left-0 w-screen h-screen z-50 flex flex-col"
                  style={{
                    background: "rgba(5,5,10,0.97)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  {/* ── Header ── */}
                  <div className="flex items-center justify-between px-10 py-4 border-b border-white/10 flex-shrink-0">
                    <Link
                      to="/user-dashboard"
                      onClick={() => setExploreOpen(false)}
                    >
                      <Logo />
                    </Link>
                    <div className="flex items-center gap-4">
                      <span className="text-cyan-400/50 font-mono text-sm tracking-widest">
                        {currentTime}
                      </span>
                      <button
                        onClick={() => setExploreOpen(false)}
                        className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors group ml-2"
                      >
                        <span className="text-sm">Close</span>
                        <IoCloseOutline
                          size={20}
                          className="group-hover:rotate-90 transition-transform duration-200"
                        />
                      </button>
                    </div>
                  </div>
                  {/* ── Three-column body ── */}
                  <div className="flex flex-1 overflow-hidden">
                    {/* LEFT — Categories */}
                    <div className="w-60 border-r border-white/10 py-8 px-5 flex flex-col gap-1 overflow-y-auto flex-shrink-0">
                      <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-4">
                        Browse by Subject
                      </p>
                      {["All", ...categories].map((cat) => (
                        <motion.button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          onMouseEnter={() => setSelectedCategory(cat)}
                          whileTap={{ scale: 0.97 }}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                            selectedCategory === cat
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_14px_rgba(34,211,238,0.12)]"
                              : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          {cat}
                        </motion.button>
                      ))}
                    </div>

                    {/* CENTRE — Courses */}
                    <div className="flex-1 py-8 px-8 overflow-y-auto">
                      <div className="flex items-center gap-2 mb-6">
                        <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
                          {selectedCategory === "All"
                            ? "All Courses"
                            : selectedCategory}
                        </p>
                        <span className="text-cyan-500 text-xs font-bold">
                          {filteredCourses.length}
                        </span>
                      </div>
                      <motion.div
                        className="grid grid-cols-2 xl:grid-cols-3 gap-4"
                        variants={containerVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                      >
                        {filteredCourses.slice(0, 6).map((course) => (
                          <motion.div
                            key={course._id}
                            className="group relative rounded-2xl overflow-hidden border border-white/5 hover:border-cyan-500/30 transition-all duration-300 cursor-pointer bg-white/3"
                            variants={itemVariants}
                            whileHover={{
                              y: -4,
                              boxShadow: "0 12px 40px rgba(34,211,238,0.1)",
                            }}
                          >
                            <div className="relative h-36 overflow-hidden">
                              <img
                                src={course.thumbnailUrl}
                                alt={course.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                              {course.duration && (
                                <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full border border-white/10">
                                  {course.duration}
                                </span>
                              )}
                              {course.level && (
                                <span className="absolute top-2 left-2 bg-cyan-500/20 backdrop-blur text-cyan-300 text-xs px-2 py-0.5 rounded-full border border-cyan-500/20">
                                  {course.level}
                                </span>
                              )}
                            </div>
                            <div className="p-4">
                              <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2 group-hover:text-cyan-200 transition-colors">
                                {course.title}
                              </h3>
                              {course.category && (
                                <p className="text-gray-500 text-xs mt-1">
                                  {course.category}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-3">
                                <span className="text-cyan-400 text-sm font-semibold">
                                  {course.price === 0
                                    ? "Free"
                                    : `₹${course.price}`}
                                </span>
                                <span className="text-yellow-400 text-xs">
                                  ★ {course.averageRating?.toFixed(1) || "New"}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        {filteredCourses.length === 0 && (
                          <div className="col-span-3 text-center py-16">
                            <p className="text-4xl mb-3">🔍</p>
                            <p className="text-gray-600 text-base">
                              No courses in this category yet
                            </p>
                          </div>
                        )}
                      </motion.div>
                      {filteredCourses.length > 6 && (
                        <Link
                          to="/explore-courses"
                          onClick={() => setExploreOpen(false)}
                          className="inline-flex items-center gap-2 mt-8 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors group"
                        >
                          View all {filteredCourses.length} courses
                          <IoIosArrowRoundForward
                            size={18}
                            className="group-hover:translate-x-1 transition-transform"
                          />
                        </Link>
                      )}
                    </div>

                    {/* RIGHT — Instructor Spotlight */}
                    <div
                      className="w-68 border-l border-white/10 py-8 px-5 overflow-y-auto flex-shrink-0"
                      style={{ width: "17rem" }}
                    >
                      <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-6">
                        Instructor Spotlight
                      </p>
                      <motion.div
                        className="flex flex-col gap-3"
                        variants={containerVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                      >
                        {(selectedCategory === "All"
                          ? instructors
                          : instructors.filter((inst) =>
                              (Array.isArray(inst.categories)
                                ? inst.categories
                                : Array.isArray(inst.expertise)
                                  ? inst.expertise
                                  : [inst.category || inst.expertise || ""]
                              )
                                .map((cat) => String(cat).toLowerCase())
                                .includes(selectedCategory.toLowerCase()),
                            )
                        )
                          .slice(0, 5)
                          .map((inst) => (
                            <motion.div
                              key={inst._id}
                              className="group rounded-2xl p-4 border border-white/5 hover:border-cyan-500/25 transition-all duration-300 bg-white/3"
                              variants={itemVariants}
                              whileHover={{
                                boxShadow: "0 0 24px rgba(34,211,238,0.07)",
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative flex-shrink-0">
                                  <img
                                    src={
                                      inst.profileImageUrl ||
                                      inst.profilePicture ||
                                      inst.profilePhoto?.url ||
                                      "/default-profile.png"
                                    }
                                    alt={inst.fullName}
                                    className="w-11 h-11 rounded-full object-cover border-2 border-transparent group-hover:border-cyan-500/50 transition-colors duration-300"
                                  />
                                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-cyan-400 rounded-full border-2 border-black" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm font-semibold truncate group-hover:text-cyan-200 transition-colors">
                                    {inst.fullName}
                                  </p>
                                  <p className="text-gray-500 text-xs truncate mt-0.5">
                                    {inst.expertise?.slice(0, 2).join(" · ") ||
                                      "Educator"}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        {instructors.length === 0 && (
                          <p className="text-gray-600 text-sm text-center py-8">
                            No instructors yet
                          </p>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="text-white flex items-center">
            <div className="relative w-80">
              <input
                type="search"
                className="bg-gray-950 w-full h-9 rounded-lg pl-10 pr-2 py-2 focus:outline-none border-[0.5px] border-gray-900 text-white"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    navigate(
                      `/explore-courses?q=${encodeURIComponent(searchQuery.trim())}`,
                    );
                  }
                }}
              />
              <button
                className="cursor-pointer"
                onClick={() => {
                  if (searchQuery.trim()) {
                    navigate(
                      `/explore-courses?q=${encodeURIComponent(searchQuery.trim())}`,
                    );
                  }
                }}
              >
                <IoIosSearch
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
              </button>
            </div>
          </div>

          <h1 className="text-white text-xl font-mono whitespace-nowrap mr-5 ml-14">
            {currentTime}
          </h1>

          <Link
            to="/loginadmin"
            className="text-white text-xl hover:text-cyan-300 cursor-pointer transition-colors whitespace-nowrap ml-10"
          >
            Become a teacher
          </Link>

          <Link
            to="/user-dashboard"
            className="text-white text-xl hover:text-cyan-300 cursor-pointer transition-colors whitespace-nowrap ml-10"
          >
            My learning
          </Link>
        </div>
      </div>

      {/* Right side - Icons and Profile */}
      <div className="flex items-center space-x-8 flex-shrink-0">
        <div className="relative">
          <button
            className="rounded-full overflow-hidden w-10 h-10 border-2 border-gray-600 hover:border-cyan-300 transition-colors"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {profilePicture ? (
              <img
                src={profilePicture}
                alt="Profile"
                className="object-cover w-full h-full"
                onError={(e) => {
                  console.error(
                    "❌ Profile image failed to load:",
                    profilePicture,
                  );
                  console.error("❌ Image error event:", e);
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
                onLoad={() => {
                  console.log(
                    "✅ Profile image loaded successfully:",
                    profilePicture,
                  );
                }}
              />
            ) : (
              <div className="bg-gradient-to-br from-cyan-600 to-blue-600 w-full h-full flex items-center justify-center text-white font-semibold">
                {user?.username?.charAt(0)?.toUpperCase() ||
                  user?.email?.charAt(0)?.toUpperCase() ||
                  "U"}
              </div>
            )}
            <div
              className="bg-gradient-to-br from-cyan-600 to-blue-600 w-full h-full flex items-center justify-center text-white font-semibold"
              style={{ display: "none" }}
            >
              {user?.username?.charAt(0)?.toUpperCase() ||
                user?.email?.charAt(0)?.toUpperCase() ||
                "U"}
            </div>
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                className="absolute right-0 mt-2 w-64 bg-gray-950 border border-gray-900 rounded-lg shadow-lg z-50 font-poppins"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
              >
                {/* User Info Section with padding */}
                <div className="p-4 border-b border-gray-800">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-full overflow-hidden w-12 h-12 border-2 border-gray-600">
                      {profilePicture ? (
                        <img
                          src={profilePicture}
                          alt="Profile"
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            console.error(
                              "❌ Profile image failed to load:",
                              profilePicture,
                            );
                            console.error("❌ Image error event:", e);
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                          onLoad={() => {
                            console.log(
                              "✅ Profile image loaded successfully:",
                              profilePicture,
                            );
                          }}
                        />
                      ) : (
                        <div className="bg-gradient-to-br from-cyan-600 to-blue-600 w-full h-full flex items-center justify-center text-white font-semibold">
                          {user?.username?.charAt(0)?.toUpperCase() ||
                            user?.email?.charAt(0)?.toUpperCase() ||
                            "U"}
                        </div>
                      )}
                      <div
                        className="bg-gradient-to-br from-cyan-600 to-blue-600 w-full h-full flex items-center justify-center text-white font-semibold"
                        style={{ display: "none" }}
                      >
                        {user?.username?.charAt(0)?.toUpperCase() ||
                          user?.email?.charAt(0)?.toUpperCase() ||
                          "U"}
                      </div>
                    </div>

                    {/* User Details */}
                    <div className="flex-1">
                      <p className="text-white text-sm truncate">
                        {user?.username || "User"}
                      </p>
                      <p className="text-gray-400 text-xs truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu Items without padding for full-width hover */}
                <div className="py-2">
                  <Link
                    to="/user-Profile"
                    className="block w-full px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-cyan-300 transition-colors text-sm"
                    onClick={() => setShowDropdown(false)}
                  >
                    View Profile
                  </Link>

                  <Link
                    to="/my-learning"
                    className="block w-full px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-cyan-300 transition-colors text-sm"
                    onClick={() => setShowDropdown(false)}
                  >
                    My Learning
                  </Link>

                  <Link
                    to="/settings"
                    className="block w-full px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-cyan-300 transition-colors text-sm"
                    onClick={() => setShowDropdown(false)}
                  >
                    Settings
                  </Link>

                  <hr className="border-gray-800 my-2" />

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      HandleLogout();
                    }}
                    className="block w-full text-left px-4 py-2 text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors text-sm"
                  >
                    Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default NavbarUser;
