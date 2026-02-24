import React, { useState } from "react";
import { easeInOut, motion } from "framer-motion";
import { ReactLenis, useLenis } from "lenis/react";

const About = () => {
  const lenis = useLenis((lenis) => {
    // called every scroll
    console.log(lenis);
  });

  const [accessibilityHoveredIndex, setAccessibilityHoveredIndex] =
    useState(null);
  const [supportHoveredIndex, setSupportHoveredIndex] = useState(null);
  const [toolsHoveredIndex, setToolsHoveredIndex] = useState(null);
  const [analyticsHoveredIndex, setAnalyticsHoveredIndex] = useState(null);

  return (
    <div className="min-h-screen font-poppins">
      <ReactLenis
        root
        options={{
          lerp: 0.2, // snappier scroll (0.1–0.2 is ideal)
          duration: 1, // faster animation duration
          wheelMultiplier: 2.5, // scroll farther per mouse wheel gesture
          smoothWheel: true, // enable smooth wheel scroll
          smoothTouch: true,
        }}
      />
      <div className="flex justify-center">
        <div className="w-[70%]">
          <h1 className="text-white mt-24 text-5xl leading-14">
            At Nabha Learning, we believe that education should be accessible,
            engaging, and transformative for everyone. Our mission is to empower
            rural students from all backgrounds to unlock their full potential
            across all subjects and skills.
          </h1>
        </div>
      </div>
      <div className="flex justify-center mt-32">
        <div className="w-[70%] border-t-[1.5px] border-cyan-600 flex justify-between">
          <div className="w-[30%] flex mt-14">
            <h1 className="text-5xl text-cyan-300">Accessibility</h1>
          </div>
          <div className="w-[60%]">
            <motion.div
              layout
              className="pt-14 p-4 group border-b-[1px] border-gray-400"
              initial={{ backgroundColor: "black", color: "white" }}
              animate={{ backgroundColor: "#000000", color: "#ffffff" }}
              whileHover={{ backgroundColor: "#53eafd", color: "#000000" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              onHoverStart={() => setAccessibilityHoveredIndex(0)}
              onHoverEnd={() => setAccessibilityHoveredIndex(null)}
            >
              <h1 className="text-5xl font-semibold">Free for Students</h1>
              <div className="overflow-hidden">
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{
                    opacity: accessibilityHoveredIndex === 0 ? 1 : 0,
                    height: accessibilityHoveredIndex === 0 ? "auto" : 0,
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="text-black text-lg font-normal overflow-hidden"
                >
                  All educational content is free to access for rural students,
                  ensuring that financial constraints never hold back learning
                  opportunities.
                </motion.div>
              </div>
            </motion.div>
            <motion.div
              layout
              className=" pt-8 p-4 group border-b-[1px] border-gray-400"
              initial={{ backgroundColor: "black", color: "white" }}
              animate={{ backgroundColor: "#000000", color: "#ffffff" }}
              whileHover={{ backgroundColor: "#53eafd", color: "#000000" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              onHoverStart={() => setAccessibilityHoveredIndex(1)}
              onHoverEnd={() => setAccessibilityHoveredIndex(null)}
            >
              <h1 className="text-5xl font-semibold">
                Device & Internet Friendly
              </h1>
              <div className="overflow-hidden">
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{
                    opacity: accessibilityHoveredIndex === 1 ? 1 : 0,
                    height: accessibilityHoveredIndex === 1 ? "auto" : 0,
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="text-black text-lg font-normal overflow-hidden"
                >
                  Our platform works seamlessly on mobile, tablet, and desktop.
                  It's optimized for low bandwidth and poor connectivity in
                  rural areas.
                </motion.div>
              </div>
            </motion.div>
            <motion.div
              layout
              className=" pt-8 p-4 group border-b-[1px] border-gray-400"
              initial={{ backgroundColor: "black", color: "white" }}
              animate={{ backgroundColor: "#000000", color: "#ffffff" }}
              whileHover={{ backgroundColor: "#53eafd", color: "#000000" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              onHoverStart={() => setAccessibilityHoveredIndex(2)}
              onHoverEnd={() => setAccessibilityHoveredIndex(null)}
            >
              <h1 className="text-5xl font-semibold">Offline Learning</h1>
              <div className="overflow-hidden">
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{
                    opacity: accessibilityHoveredIndex === 2 ? 1 : 0,
                    height: accessibilityHoveredIndex === 2 ? "auto" : 0,
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="text-black text-lg font-normal overflow-hidden"
                >
                  Download lessons and continue learning anytime, even without
                  an internet connection - perfect for remote village areas.
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      {/* Educational Support Section */}
      <div className="flex justify-center mt-32">
        <div className="w-[70%] border-t-[1.5px] border-cyan-600 flex justify-between">
          <div className="w-[30%] flex mt-14">
            <h1 className="text-5xl text-cyan-300">Educational Support</h1>
          </div>
          <div className="w-[60%]">
            <motion.div
              layout
              className="pt-14 p-4 group border-b-[1px] border-gray-400"
              initial={{ backgroundColor: "black", color: "white" }}
              animate={{ backgroundColor: "#000000", color: "#ffffff" }}
              whileHover={{ backgroundColor: "#53eafd", color: "#000000" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              onHoverStart={() => setSupportHoveredIndex(0)}
              onHoverEnd={() => setSupportHoveredIndex(null)}
            >
              <h1 className="text-5xl font-semibold">Built-in AI Tutor</h1>
              <div className="overflow-hidden">
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{
                    opacity: supportHoveredIndex === 0 ? 1 : 0,
                    height: supportHoveredIndex === 0 ? "auto" : 0,
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="text-black text-lg font-normal overflow-hidden"
                >
                  Get help instantly with our AI tutor, available 24/7 to answer
                  questions across all subjects and provide learning support.
                </motion.div>
              </div>
            </motion.div>
            <motion.div
              layout
              className=" pt-8 p-4 group border-b-[1px] border-gray-400"
              initial={{ backgroundColor: "black", color: "white" }}
              animate={{ backgroundColor: "#000000", color: "#ffffff" }}
              whileHover={{ backgroundColor: "#53eafd", color: "#000000" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              onHoverStart={() => setSupportHoveredIndex(1)}
              onHoverEnd={() => setSupportHoveredIndex(null)}
            >
              <h1 className="text-5xl font-semibold">Progress Tracking</h1>
              <div className="overflow-hidden">
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{
                    opacity: supportHoveredIndex === 1 ? 1 : 0,
                    height: supportHoveredIndex === 1 ? "auto" : 0,
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="text-black text-lg font-normal overflow-hidden"
                >
                  Get personalized progress tracking and performance analysis
                  across all subjects to stay motivated and on course.
                </motion.div>
              </div>
            </motion.div>
            <motion.div
              layout
              className=" pt-8 p-4 group border-b-[1px] border-gray-400"
              initial={{ backgroundColor: "black", color: "white" }}
              animate={{ backgroundColor: "#000000", color: "#ffffff" }}
              whileHover={{ backgroundColor: "#53eafd", color: "#000000" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              onHoverStart={() => setSupportHoveredIndex(2)}
              onHoverEnd={() => setSupportHoveredIndex(null)}
            >
              <h1 className="text-5xl font-semibold">
                Teacher Support (For Educators)
              </h1>
              <div className="overflow-hidden">
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{
                    opacity: supportHoveredIndex === 2 ? 1 : 0,
                    height: supportHoveredIndex === 2 ? "auto" : 0,
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="text-black text-lg font-normal overflow-hidden"
                >
                  Rural teachers can connect with support educators for content
                  feedback and teaching methodology improvements.
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Learning Resources Section */}
      <div className="flex justify-center mt-32">
        <div className="w-[70%] border-t-[1.5px] border-cyan-600 flex justify-between">
          <div className="w-[30%] flex mt-14">
            <h1 className="text-5xl text-cyan-300">Learning Resources</h1>
          </div>
          <div className="w-[60%]">
            <motion.div
              layout
              className="pt-14 p-4 group border-b-[1px] border-gray-400"
              initial={{ backgroundColor: "black", color: "white" }}
              animate={{ backgroundColor: "#000000", color: "#ffffff" }}
              whileHover={{ backgroundColor: "#53eafd", color: "#000000" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              onHoverStart={() => setToolsHoveredIndex(0)}
              onHoverEnd={() => setToolsHoveredIndex(null)}
            >
              <h1 className="text-5xl font-semibold">Interactive Content</h1>
              <div className="overflow-hidden">
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{
                    opacity: toolsHoveredIndex === 0 ? 1 : 0,
                    height: toolsHoveredIndex === 0 ? "auto" : 0,
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="text-black text-lg font-normal overflow-hidden"
                >
                  Engage with interactive lessons, quizzes, and multimedia
                  content designed for comprehensive subject learning.
                </motion.div>
              </div>
            </motion.div>
            <motion.div
              layout
              className=" pt-8 p-4 group border-b-[1px] border-gray-400"
              initial={{ backgroundColor: "black", color: "white" }}
              animate={{ backgroundColor: "#000000", color: "#ffffff" }}
              whileHover={{ backgroundColor: "#53eafd", color: "#000000" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              onHoverStart={() => setToolsHoveredIndex(1)}
              onHoverEnd={() => setToolsHoveredIndex(null)}
            >
              <h1 className="text-5xl font-semibold">Practical Learning</h1>
              <div className="overflow-hidden">
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{
                    opacity: toolsHoveredIndex === 1 ? 1 : 0,
                    height: toolsHoveredIndex === 1 ? "auto" : 0,
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="text-black text-lg font-normal overflow-hidden"
                >
                  Learn through hands-on activities and real-world applications,
                  helping you strengthen concepts across all subjects.
                </motion.div>
              </div>
            </motion.div>
            <motion.div
              layout
              className=" pt-8 p-4 group border-b-[1px] border-gray-400"
              initial={{ backgroundColor: "black", color: "white" }}
              animate={{ backgroundColor: "#000000", color: "#ffffff" }}
              whileHover={{ backgroundColor: "#53eafd", color: "#000000" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              onHoverStart={() => setToolsHoveredIndex(2)}
              onHoverEnd={() => setToolsHoveredIndex(null)}
            >
              <h1 className="text-5xl font-semibold">Multi-language Support</h1>
              <div className="overflow-hidden">
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{
                    opacity: toolsHoveredIndex === 2 ? 1 : 0,
                    height: toolsHoveredIndex === 2 ? "auto" : 0,
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="text-black text-lg font-normal overflow-hidden"
                >
                  Access content in Punjabi, Hindi, and English to learn in your
                  preferred language and break language barriers.
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Analytics for Students & Educators Section */}
      <div className="flex justify-center mt-32 mb-32">
        <div className="w-[70%] border-t-[1.5px] border-cyan-600 flex justify-between">
          <div className="w-[30%] flex mt-14">
            <h1 className="text-5xl text-cyan-300">
              Analytics for Students & Educators
            </h1>
          </div>
          <div className="w-[60%]">
            <motion.div
              layout
              className="pt-14 p-4 group border-b-[1px] border-gray-400"
              initial={{ backgroundColor: "black", color: "white" }}
              animate={{ backgroundColor: "#000000", color: "#ffffff" }}
              whileHover={{ backgroundColor: "#53eafd", color: "#000000" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              onHoverStart={() => setAnalyticsHoveredIndex(0)}
              onHoverEnd={() => setAnalyticsHoveredIndex(null)}
            >
              <h1 className="text-5xl font-semibold">
                Student Progress Tracking
              </h1>
              <div className="overflow-hidden">
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{
                    opacity: analyticsHoveredIndex === 0 ? 1 : 0,
                    height: analyticsHoveredIndex === 0 ? "auto" : 0,
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="text-black text-lg font-normal overflow-hidden"
                >
                  Students can visualize their learning journey across all
                  subjects with detailed progress charts and completion stats.
                </motion.div>
              </div>
            </motion.div>
            <motion.div
              layout
              className=" pt-8 p-4 group border-b-[1px] border-gray-400"
              initial={{ backgroundColor: "black", color: "white" }}
              animate={{ backgroundColor: "#000000", color: "#ffffff" }}
              whileHover={{ backgroundColor: "#53eafd", color: "#000000" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              onHoverStart={() => setAnalyticsHoveredIndex(1)}
              onHoverEnd={() => setAnalyticsHoveredIndex(null)}
            >
              <h1 className="text-5xl font-semibold">
                Educator Content Insights
              </h1>
              <div className="overflow-hidden">
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{
                    opacity: analyticsHoveredIndex === 1 ? 1 : 0,
                    height: analyticsHoveredIndex === 1 ? "auto" : 0,
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="text-black text-lg font-normal overflow-hidden"
                >
                  Educators get access to analytics like engagement rates,
                  learning outcomes, and student performance data across
                  subjects.
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
