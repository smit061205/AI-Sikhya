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
  const { isExploreOpen, setExploreOpen } = useExploreDropdown(); // Use shared state
  const navigate = useNavigate();
  const [profilePicture, setProfilePicture] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [instructors, setInstructors] = useState([]);
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
        const response = await fetch("http://localhost:3000/courses");
        const data = await response.json();
        setCourses(data.courses || []);
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      }
    };

    const fetchInstructors = async () => {
      try {
        const response = await fetch("http://localhost:3000/admin/instructors");
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="fixed top-0 left-0 w-screen bg-gray-950 shadow-lg border-t z-50 overflow-auto"
                >
                  <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between">
                    <Link
                      to={"/user-dashboard"}
                      onClick={() => setExploreOpen(false)}
                    >
                      <Logo />
                    </Link>
                    <h1 className="text-white text-xl font-mono whitespace-nowrap mr-5 ml-14 mt-4">
                      {currentTime}
                    </h1>
                    <div className="flex justify-center cursor-pointer ">
                      <h1
                        className="text-white mt-[10px] text-xl hover:text-cyan-300 transition-colors duration-100"
                        onClick={() => setExploreOpen(false)}
                      >
                        Close
                      </h1>
                      <button
                        className="text-white cursor-pointer hover:text-cyan-300 transition-colors duration-100"
                        onClick={() => setExploreOpen(false)}
                      >
                        <IoCloseOutline size={32} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-row items-start gap-8 p-10 h-[calc(100vh-1px)] overflow-y-auto">
                    <motion.div
                      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-8 w-96 self-start"
                      variants={containerVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {filteredCourses.slice(0, 2).map((course) => (
                        <motion.div
                          key={course._id}
                          className="bg-gray-950 rounded-lg overflow-hidden shadow-lg"
                          variants={itemVariants}
                        >
                          <div className="relative">
                            <img
                              src={course.thumbnailUrl}
                              alt={course.title}
                              className="w-full object-cover"
                            />
                            <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                              {course.duration}
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="text-white text-xl">
                              {course.title}
                            </h3>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                    <div className="flex flex-col items-center justify-center space-y-5 flex-1 mt-20 mr-40 ml-32">
                      <motion.button
                        onClick={() => setSelectedCategory("All")}
                        onMouseEnter={() => setSelectedCategory("All")}
                        className=" text-white hover:text-cyan-300 transition-colors duration-100 text-3xl"
                        initial={{ scale: 1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        All
                      </motion.button>
                      {categories.map((category) => (
                        <motion.button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          onMouseEnter={() => setSelectedCategory(category)}
                          className=" text-white hover:text-cyan-300 transition-colors duration-100 text-3xl"
                          initial={{ scale: 1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {category}
                        </motion.button>
                      ))}
                    </div>
                    {/* Instructor Spotlight Section */}
                    <div className="flex flex-col items-start justify-start space-y-6 flex-1">
                      <h2 className="text-2xl text-white">
                        Instructor Spotlight
                      </h2>
                      <motion.div
                        className="flex flex-col space-y-6"
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
                                .includes(selectedCategory.toLowerCase())
                            )
                        )
                          .slice(0, 4)
                          .map((inst) => (
                            <motion.div
                              key={inst._id}
                              className="bg-gray-950 rounded-lg p-4 w-72 hover:border-cyan-400 transition-all duration-300"
                              variants={itemVariants}
                            >
                              <div className="flex items-center space-x-4">
                                <img
                                  src={
                                    inst.profileImageUrl ||
                                    inst.profilePicture ||
                                    inst.profilePhoto?.url ||
                                    "/default-profile.png"
                                  }
                                  alt={inst.name}
                                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-800"
                                />
                                <div>
                                  <div className="text-white text-lg ">
                                    {inst.fullName}
                                  </div>
                                  {/* <div className="text-gray-400 text-sm mt-1">
                                    {(inst.bio || inst.description || "")
                                      .length > 100
                                      ? (
                                          inst.bio ||
                                          inst.description ||
                                          ""
                                        ).slice(0, 100) + "..."
                                      : inst.bio || inst.description || ""}
                                  </div> */}
                                </div>
                              </div>
                              <div className="flex justify-center">
                                <Link
                                  to={`/instructor/${inst._id}`}
                                  className="inline-block mt-1 py-2 text-white transition-all duration-200 text-lg text-center"
                                >
                                  <motion.div
                                    className="relative inline-flex items-center gap-1"
                                    whileHover="hover"
                                    initial="initial"
                                  >
                                    <span className="text-white">
                                      View Profile
                                    </span>
                                    <motion.span
                                      variants={{
                                        initial: {
                                          scaleX: 0,
                                          transformOrigin: "center",
                                        },
                                        hover: {
                                          scaleX: 1,
                                          transformOrigin: "center",
                                        },
                                      }}
                                      transition={{ duration: 0.3 }}
                                      className="absolute left-0 bottom-0 w-full h-[1px] bg-white"
                                    />
                                    <motion.span
                                      className="text-white ml-1"
                                      variants={{
                                        initial: { rotate: 0 },
                                        hover: { rotate: -30 },
                                      }}
                                      transition={{ duration: 0.3 }}
                                    >
                                      <IoIosArrowRoundForward size={25} />
                                    </motion.span>
                                  </motion.div>
                                </Link>
                              </div>
                            </motion.div>
                          ))}
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
                className="bg-gray-950 w-full h-9 rounded-lg pl-10 pr-2 py-2 focus:outline-none border-[0.5px] border-gray-900"
                placeholder="Search..."
              />
              <button className="cursor-pointer">
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

          <button className="text-white text-xl hover:text-cyan-300 cursor-pointer transition-colors whitespace-nowrap ml-10">
            Become a teacher
          </button>

          <button className="text-white text-xl hover:text-cyan-300 cursor-pointer transition-colors whitespace-nowrap ml-10">
            My learning
          </button>
        </div>
      </div>

      {/* Right side - Icons and Profile */}
      <div className="flex items-center space-x-8 flex-shrink-0">
        <div className="flex items-center space-x-5">
          <motion.button
            className="cursor-pointer"
            initial={{ scale: 1 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaRegHeart
              className="text-gray-400 hover:text-cyan-300 transition-colors"
              size={20}
            />
          </motion.button>
          <button className="cursor-pointer">
            <IoCartOutline
              className="text-gray-400 hover:text-cyan-300 transition-colors"
              size={22}
            />
          </button>
          <button className="cursor-pointer">
            <FaRegBell
              className="text-gray-400 hover:text-cyan-300 transition-colors"
              size={20}
            />
          </button>
        </div>
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
                    profilePicture
                  );
                  console.error("❌ Image error event:", e);
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
                onLoad={() => {
                  console.log(
                    "✅ Profile image loaded successfully:",
                    profilePicture
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
                              profilePicture
                            );
                            console.error("❌ Image error event:", e);
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                          onLoad={() => {
                            console.log(
                              "✅ Profile image loaded successfully:",
                              profilePicture
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
