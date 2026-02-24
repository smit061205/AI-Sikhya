import React, { useState } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const Contact = () => {
  const lenis = useLenis((lenis) => {
    // called every scroll
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success', 'error', or null

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      alert("Please enter your name");
      return false;
    }
    if (!formData.email.trim()) {
      alert("Please enter your email");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      alert("Please enter a valid email address");
      return false;
    }
    if (!formData.message.trim()) {
      alert("Please enter your message");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await axios.post(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
        }/api/contact`,
        {
          name: formData.name,
          email: formData.email,
          message: formData.message,
        }
      );

      if (response.data.success) {
        setSubmitStatus("success");
        setFormData({ name: "", email: "", message: "" });
      } else {
        setSubmitStatus("error");
      }
    } catch (error) {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
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
      <div className="min-h-screen font-poppins flex justify-center">
        <div className="w-[80%] mt-20">
          <div className="flex space-x-20">
            <div className="w-[45%]">
              <h1 className="text-white text-5xl ml-10 font-semibold">
                Get in Touch
              </h1>
              <h1 className="text-white text-xl ml-10 mt-5 font-light">
                Have feedback, ideas, or need a hand? We'd love to connect! At
                ZappyLearn, we believe learning grows stronger through
                collaboration — drop us a message and let's shape the future of
                education together, one step at a time.
              </h1>
            </div>
            <div className="w-[55%]">
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="text-gray-300 outline-none w-[100%] h-[50px] pl-3 border-b-[0.5px] border-b-gray-600 focus:border-b-cyan-300 bg-transparent"
                  placeholder="Your Name"
                  required
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="text-gray-300 outline-none w-[100%] h-[50px] pl-3 border-b-[0.5px] border-b-gray-600 mt-6 focus:border-b-cyan-300 bg-transparent"
                  placeholder="Your Email"
                  required
                />
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  className="text-gray-300 outline-none w-[100%] h-[150px] pl-3 pt-3 border-b-[0.5px] border-b-gray-600 mt-6 focus:border-b-cyan-300 bg-transparent resize-none"
                  placeholder="Your Message"
                  required
                ></textarea>

                {submitStatus === "success" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-green-400 text-sm mt-2"
                  >
                    Message sent successfully! We'll get back to you soon.
                  </motion.div>
                )}

                {submitStatus === "error" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-sm mt-2"
                  >
                    Failed to send message. Please try again or contact us
                    directly at zappylearn06@gmail.com
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  className={`cursor-pointer bg-gradient-to-br from-cyan-200 to-cyan-300 p-1 px-3 text-black rounded-full mt-3 w-full h-12 text-2xl ${
                    isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  initial={{ scale: 1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isSubmitting ? "SENDING..." : "SEND MESSAGE"}
                </motion.button>
              </form>
            </div>
          </div>
          <div className="border-t-[1px] border-gray-700 w-full mt-10">
            <h1 className="text-white text-5xl ml-10 mt-10 font-semibold">
              Contact the Creator
            </h1>
            <h1 className="text-white text-3xl ml-10 mt-5 font-light">
              Have a question about how ZappyLearn was built or want to connect
              directly with the creator?
            </h1>
            <h1 className="text-white text-2xl ml-10 mt-5 font-light">
              I’m always open to feedback, ideas, or even just a quick chat
              about web development and learning tools. Feel free to reach out —
              I’d love to hear from you.
            </h1>
            <div className="flex justify-evenly mt-10">
              <a
                href="mailto:smit061205@gmail.com"
                className="text-white text-3xl hover:text-cyan-300 transition-colors duration-300"
              >
                Gmail
              </a>
              <a
                href="https://www.linkedin.com/in/smit-thakkar-379ab6293/"
                className="text-white text-3xl hover:text-cyan-300 transition-colors duration-300"
              >
                Linkedin
              </a>
              <a
                href="https://github.com/smit061205"
                className="text-white text-3xl hover:text-cyan-300 transition-colors duration-300"
              >
                Github
              </a>
              <a
                href="https://www.instagram.com/smitthakkar64/"
                className="text-white text-3xl hover:text-cyan-300 transition-colors duration-300"
              >
                Instagram
              </a>
              <a
                href="https://x.com/smit061205"
                className="text-white text-3xl hover:text-cyan-300 transition-colors duration-300"
              >
                X
              </a>
              <a
                href="https://wa.me/+918160167021"
                className="text-white text-3xl hover:text-cyan-300 transition-colors duration-300"
              >
                Phone
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Contact;
