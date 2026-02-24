import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Logo from "./Logo";
const Navbar = () => {
  return (
    <div className="pt-1 h-18 border-b-[0.5px] border-b-gray-600 flex flex-row justify-between bg-black">
      <div className="ml-6 mt-2">
        <Link to="/">
          <Logo />
        </Link>
      </div>
      <div className="text-white flex items-center space-x-12 text-2xl">
        <Link
          to="/"
          className="hover:text-cyan-300 transition-colors duration-300"
        >
          Home
        </Link>
        <Link
          to="/about"
          className="hover:text-cyan-300 transition-colors duration-300"
        >
          About
        </Link>
        <Link
          to="/contact"
          className="hover:text-cyan-300 transition-colors duration-300"
        >
          Contact
        </Link>
      </div>
      <div className="text-white flex items-center space-x-7 text-2xl mr-5">
        <Link to="/login">
          <motion.button
            className="cursor-pointer bg-gradient-to-br from-cyan-200 to-cyan-300 p-1 px-3 text-black rounded-2xl"
            initial={{ scale: 1 }}
            whileTap={{ scale: 0.95 }}
          >
            Login
          </motion.button>
        </Link>
        <Link to='/signup'>
        <motion.button
          className="cursor-pointer bg-gradient-to-br from-cyan-200 to-cyan-300 p-1 px-3 text-black rounded-2xl"
          initial={{ scale: 1 }}
          whileTap={{ scale: 0.95 }}
        >
          Signup
        </motion.button>
        </Link>
      </div>
    </div>
  );
};

export default Navbar;
