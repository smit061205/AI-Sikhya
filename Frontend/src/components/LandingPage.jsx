import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ReactLenis, useLenis } from "lenis/react";
import { AnimateSvg } from "./SvgLine";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();
  const lenis = useLenis((lenis) => {
    // called every scroll
  });
  const [courses, setCourses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [instructors, setInstructors] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

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
      }
    };

    fetchCourses();
    fetchInstructors();
  }, []);

  const categories = [
    "Mathematics",
    "Science",
    "English",
    "Digital Skills",
    "Agriculture",
    "Life Skills",
  ];

  const filteredCourses =
    selectedCategory === "All"
      ? courses
      : courses.filter((course) => course.category === selectedCategory);

  return (
    <>
      <ReactLenis
        root
        options={{
          lerp: 0.2, // snappier scroll (0.1–0.2 is ideal)
          duration: 2, // faster animation duration
          wheelMultiplier: 2.5, // scroll farther per mouse wheel gesture
          smoothWheel: true, // enable smooth wheel scroll
          smoothTouch: true,
        }}
      />
      <div className="min-h-screen bg-black font-poppins">
        <div className="mt-36 ml-20 flex justify-center">
          <div className="w-[85%] ">
            <h1 className="text-8xl text-white font-semibold">EMPOWER YOUR</h1>
            <h1 className="text-8xl text-white bg-clip-text mt-2 font-semibold">
              RURAL VILLAGE
            </h1>
            <h1 className="text-8xl mt-3 ml-16 font-semibold bg-gradient-to-br from-cyan-100 to-cyan-200 text-transparent bg-clip-text ">
              LEARN WITHOUT
            </h1>
            <h1 className="text-8xl bg-gradient-to-br from-cyan-200 to-cyan-300 text-transparent bg-clip-text pb-1 leading-tight text-end mr-36 font-semibold">
              BARRIERS
            </h1>
            <div className="w-32 ml-14 mt-6">
              <AnimateSvg
                width="100%"
                height="100%"
                viewBox="0 0 179 145"
                className="my-svg-animation mb-1"
                path="M175.8 53.8932C170.66 20.7707 154.662 -4.95342 116.689 6.07096C87.437 14.5634 68.7256 54.0726 89.4889 80.0265C94.4637 86.245 105.553 85.2891 111.889 81.8043C121.912 76.2915 124.3 66.5962 121.4 55.8488C116.132 36.3252 94.5076 16.8156 73.2222 22.9599C39.9122 32.5751 23.357 66.341 19.9778 98.7821C19.3047 105.244 22.4114 153.806 29.4 127.404C30.6683 122.613 33.9004 108.124 32.3333 112.827C29.735 120.623 28.6 125.112 28.6 133.538C28.6 135.21 29.8227 143.952 26.1111 140.915C18.5116 134.698 10.4687 129.095 3 122.693"
                strokeColor="#00FFFF"
                strokeWidth={2}
                strokeLinecap="round"
                animationDuration={1.7}
                animationDelay={0.1}
                animationBounce={0.2}
                reverseAnimation={false}
                enableHoverAnimation={true}
                hoverAnimationType="float"
                initialAnimation={true}
                style={{
                  opacity: 1, // Force visible
                  display: "block", // Force display
                  paddingTop: "10px", // Prevents clipping on hover
                }}
              />
            </div>
            <div className="flex flex-row -mt-7">
              <motion.button
                className="cursor-pointer bg-gradient-to-br from-cyan-200 to-cyan-300 p-2 px-4 text-xl py-7 text-black rounded-2xl h-12 flex items-center mt-7"
                initial={{ scale: 1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/signup")}
              >
                <p className="">Start Learning</p>
              </motion.button>

              <div>
                <p className="text-white ml-12 -mt-4 text-3xl">
                  We're AI-Sikhya. Bringing quality education to rural
                  communities. Making learning accessible to every student,
                  everywhere.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-80 ml-10 text-2xl text-white flex justify-center">
          <h1 className="text-5xl">Subjects we offer</h1>
        </div>
        <div className="flex justify-center mt-10 space-x-8">
          <motion.button
            onClick={() => setSelectedCategory("All")}
            className="cursor-pointer bg-gradient-to-br from-cyan-200 to-cyan-300 p-2 px-4 text-black rounded-2xl text-lg"
            initial={{ scale: 1 }}
            whileTap={{ scale: 0.95 }}
          >
            All
          </motion.button>
          {categories.map((category) => (
            <motion.button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className="cursor-pointer bg-gradient-to-br from-cyan-200 to-cyan-300 p-2 px-4 text-black rounded-2xl text-lg"
              initial={{ scale: 1 }}
              whileTap={{ scale: 0.95 }}
            >
              {category}
            </motion.button>
          ))}
        </div>
        <div className="mt-10 p-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredCourses.map((course) => (
            <motion.div
              key={course._id}
              className="bg-gray-950 rounded-lg overflow-hidden shadow-lg"
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {course.duration}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-white text-xl">{course.title}</h3>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex justify-center">
          <motion.button
            className="cursor-pointer bg-gradient-to-br from-cyan-200 to-cyan-300 p-2 px-4 text-black rounded-2xl text-lg"
            initial={{ scale: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/signup")}
          >
            View More
          </motion.button>
        </div>
        <div className="mt-24 text-center">
          <h1 className="text-white text-5xl font-poppins">
            We are led by dedicated educators
          </h1>
        </div>

        {/* Instructors Section */}
        <div className="mt-12 p-4">
          <div className="max-w-7xl mx-auto">
            {/* Carousel Container */}
            <div className="relative overflow-hidden">
              {/* Navigation Arrows */}
              <button
                onClick={() =>
                  setCurrentSlide((prev) =>
                    prev === 0 ? Math.max(0, instructors.length - 3) : prev - 1,
                  )
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-cyan-500/20 hover:bg-cyan-500/40 backdrop-blur-sm rounded-full p-3 transition-all duration-300 group"
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="w-6 h-6 text-white group-hover:text-cyan-300" />
              </button>

              <button
                onClick={() =>
                  setCurrentSlide((prev) =>
                    prev >= instructors.length - 3 ? 0 : prev + 1,
                  )
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-cyan-500/20 hover:bg-cyan-500/40 backdrop-blur-sm rounded-full p-3 transition-all duration-300 group"
                disabled={currentSlide >= instructors.length - 3}
              >
                <ChevronRight className="w-6 h-6 text-white group-hover:text-cyan-300" />
              </button>

              {/* Carousel Track */}
              <motion.div
                className="flex gap-8 px-16"
                animate={{
                  x: `-${currentSlide * (100 / 3)}%`,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
              >
                {instructors.map((instructor, index) => (
                  <motion.div
                    key={instructor._id}
                    className="flex-shrink-0 w-1/3"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.1,
                      ease: "easeOut",
                    }}
                  >
                    {/* Instructor Card */}
                    <div className="relative bg-gray-950 rounded-3xl p-8 text-center border border-gray-700 h-full flex flex-col group hover:border-cyan-500/50 transition-all duration-300">
                      {/* Profile image container */}
                      <div className="relative mx-auto mb-6">
                        <div className="w-28 h-28 mx-auto relative">
                          {/* Profile image */}
                          <img
                            src={
                              instructor.profilePhoto?.url ||
                              "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiM2NDc0OGIiLz48dGV4dCB4PSI3NSIgeT0iODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlVzZXI8L3RleHQ+PC9zdmc+"
                            }
                            alt={instructor.fullName}
                            className="relative w-full h-full rounded-full object-cover border-4 border-cyan-400 group-hover:border-cyan-300 transition-colors duration-300"
                          />
                        </div>
                      </div>

                      {/* Instructor info */}
                      <div className="space-y-4 flex-grow flex flex-col">
                        <div>
                          <h3 className="text-2xl font-poppins text-white mb-2 group-hover:text-cyan-300 transition-colors duration-300">
                            {instructor.fullName}
                          </h3>
                        </div>

                        {/* Description */}
                        <div className="flex-grow">
                          <p className="text-gray-300 text-base leading-relaxed text-left bg-gray-800/30 p-4 rounded-xl font-poppins">
                            {instructor.description ||
                              "Passionate educator with years of experience, dedicated to helping rural students master essential skills and build successful futures."}
                          </p>
                        </div>

                        {/* Skills/Expertise indicators */}
                        <div className="mt-6 text-left">
                          <h4 className="text-sm font-semibold text-gray-400 mb-2">
                            Expertise
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {instructor.expertise &&
                            instructor.expertise.length > 0 ? (
                              instructor.expertise.map((skill, i) => (
                                <span
                                  key={i}
                                  className="text-xs font-medium text-cyan-200 bg-cyan-900/50 px-3 py-1"
                                >
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <p className="text-xs text-gray-500">
                                Skills not specified.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Carousel Indicators */}
            <div className="flex justify-center mt-8 space-x-2">
              {Array.from({ length: Math.max(1, instructors.length - 2) }).map(
                (_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      currentSlide === index
                        ? "bg-cyan-400 scale-110"
                        : "bg-gray-600 hover:bg-gray-500"
                    }`}
                  />
                ),
              )}
            </div>
          </div>
        </div>
        <div className="mt-20">
          <div className="flex w-full justify-center text-white">
            <h1 className="text-5xl">Why choose Nabha Learning</h1>
          </div>
          <div className="grid grid-cols-1 w-full">
            <motion.div
              className="flex w-full justify-between mt-12 border-y-[1px] border-gray-400 h-28 items-center px-10 group"
              initial={{ backgroundColor: "#000000", color: "#ffffff" }}
              whileHover={{
                backgroundColor: "#53eafd",
                color: "#000000",
              }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
            >
              <h1 className="text-4xl ml-24">Our platform is free.</h1>
              <motion.div className="text-lg max-w-3xl text-right transform transition-all duration-500 ease-in-out opacity-0 translate-y-5 group-hover:translate-y-0 group-hover:opacity-100 text-black mt-4">
                Free education for all rural students, ensuring no child is left
                behind due to financial constraints.
              </motion.div>
            </motion.div>
            <motion.div
              className="flex w-full justify-between border-y-[1px] border-gray-400 h-28 items-center px-10 group"
              initial={{ backgroundColor: "#000000", color: "#ffffff" }}
              whileHover={{
                backgroundColor: "#53eafd",
                color: "#000000",
              }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
            >
              <h1 className="text-4xl ml-24 whitespace-nowrap">
                Smart Learning Assistant.
              </h1>
              <motion.div className="text-lg max-w-3xl text-right transform transition-all duration-500 ease-in-out opacity-0 translate-y-5 group-hover:translate-y-0 group-hover:opacity-100 text-black mt-4">
                AI-powered tutor helps students learn at their own pace and
                provides explanations in local languages.
              </motion.div>
            </motion.div>
            <motion.div
              className="flex w-full justify-between border-y-[1px] border-gray-400 h-28 items-center px-10 group"
              initial={{ backgroundColor: "#000000", color: "#ffffff" }}
              whileHover={{
                backgroundColor: "#53eafd",
                color: "#000000",
              }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
            >
              <h1 className="text-4xl ml-24 whitespace-nowrap">
                Interactive Learning Tools.
              </h1>
              <motion.div className="text-lg max-w-3xl text-right transform transition-all duration-500 ease-in-out opacity-0 translate-y-5 group-hover:translate-y-0 group-hover:opacity-100 text-black mt-4">
                Practice with virtual labs, simulations, and interactive
                exercises. No special equipment needed.
              </motion.div>
            </motion.div>
            <motion.div
              className="flex w-full justify-between border-y-[1px] border-gray-400 h-28 items-center px-10 group"
              initial={{ backgroundColor: "#000000", color: "#ffffff" }}
              whileHover={{
                backgroundColor: "#53eafd",
                color: "#000000",
              }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
            >
              <h1 className="text-4xl ml-24 whitespace-nowrap">
                Offline access to lectures.
              </h1>
              <motion.div className="text-lg max-w-3xl text-right transform transition-all duration-500 ease-in-out opacity-0 translate-y-5 group-hover:translate-y-0 group-hover:opacity-100 text-black mt-4">
                Download lessons and study without internet - perfect for areas
                with limited connectivity.
              </motion.div>
            </motion.div>
            <motion.div
              className="flex w-full justify-between border-y-[1px] border-gray-400 h-28 items-center px-10 group"
              initial={{ backgroundColor: "#000000", color: "#ffffff" }}
              whileHover={{
                backgroundColor: "#53eafd",
                color: "#000000",
              }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
            >
              <h1 className="text-4xl ml-24 whitespace-nowrap">
                Track your progress.
              </h1>
              <motion.div className="text-lg max-w-3xl text-right transform transition-all duration-500 ease-in-out opacity-0 translate-y-5 group-hover:translate-y-0 group-hover:opacity-100 text-black mt-4">
                Monitor your learning journey with clear progress tracking that
                keeps you motivated.
              </motion.div>
            </motion.div>
          </div>
          <div className="flex justify-center mt-10 w-full flex-row">
            <h1 className="text-white text-3xl">
              Join the Nabha Learning community :{" "}
            </h1>
            <motion.button
              className="cursor-pointer bg-gradient-to-br from-cyan-200 to-cyan-300 p-[6px] px-4 text-black rounded-2xl text-lg ml-4"
              initial={{ scale: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/signup")}
            >
              Join Now
            </motion.button>
          </div>
          <div className="mt-40 w-full">
            <h1 className="text-white text-5xl text-center">Testimonials</h1>
            <div className="w-full mt-16 flex justify-center">
              <div className="w-[80%] flex flex-row space-x-6 justify-center">
                <div className="w-[20%] p-1">
                  <p className="text-gray-950 font-bold bg-cyan-400 p-1 text-2xl h-68">
                    Nabha Learning helped me complete my 10th grade from my
                    village. The offline feature was perfect for our area!
                  </p>
                  <p className="text-white text-xl">Priya Sharma</p>
                  <p className="text-gray-300 text-sm">
                    Village Student, Rajasthan
                  </p>
                </div>
                <div className="w-[20%] p-1">
                  <p className="text-gray-950 font-bold bg-cyan-400 p-1 text-2xl h-68">
                    The agriculture courses taught me modern farming techniques
                    that increased my crop yield by 40%.
                  </p>
                  <p className="text-white text-xl">Ramesh Patel</p>
                  <p className="text-gray-300 text-sm">Farmer, Gujarat</p>
                </div>
                <div className="w-[20%] p-1">
                  <p className="text-gray-950 font-bold bg-cyan-400 p-1 text-2xl h-68">
                    I learned English and computer skills, which helped me get a
                    job in the nearby town.
                  </p>
                  <p className="text-white text-xl">Kavita Singh</p>
                  <p className="text-gray-300 text-sm">Rural Youth, UP</p>
                </div>
                <div className="w-[20%] p-1">
                  <p className="text-gray-950 font-bold bg-cyan-400 p-1 text-2xl h-68">
                    My daughter can now study advanced mathematics from our
                    remote village. Education is finally accessible.
                  </p>
                  <p className="text-white text-xl">Sunita Devi</p>
                  <p className="text-gray-300 text-sm">Parent, Bihar</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[#0D0D0D] p-16 mt-40 w-full">
            <div className="mt-28 w-full flex flex-col items-center text-center">
              <h1 className="text-white text-5xl ">
                Have any suggestions or feedback?
              </h1>
              <h1 className="text-white text-5xl mt-2 ">
                We would love to hear it from you.
              </h1>
            </div>
            <div className="flex justify-center mt-6">
              <p className="text-white text-lg">
                Feel free to reach out — your thoughts help us improve and grow.
              </p>
            </div>
            <div className="flex justify-center mt-10 mb-10">
              <motion.button
                className="cursor-pointer bg-gradient-to-br from-cyan-200 to-cyan-300 p-2 px-4 text-black rounded-2xl text-lg"
                initial={{ scale: 1 }}
                whileTap={{ scale: 0.95 }}
              >
                <a href="mailto:support@nabhalearning.org">Connect via Email</a>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LandingPage;
