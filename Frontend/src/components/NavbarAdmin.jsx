import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Logo from "./Logo";
import { useAdminAuth } from "../context/AdminAuthContext";

const NavbarAdmin = () => {
  const { adminLogout, admin } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { to: "/admin-dashboard", label: "Dashboard" },
    { to: "/admin/create-course", label: "Create Course" },
    { to: "/admin/profile", label: "Profile" },
  ];

  const isActive = (path) => {
    if (path === "/admin-dashboard")
      return location.pathname === "/admin-dashboard";
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    adminLogout();
    navigate("/loginadmin");
  };

  return (
    <div className="pt-1 h-18 border-b-[0.5px] border-b-gray-600 flex flex-row justify-between bg-black">
      <div className="ml-6 mt-2">
        <Link to="/admin-dashboard" aria-label="Admin Home">
          <Logo />
        </Link>
      </div>

      <nav className="text-white flex items-center space-x-10 text-lg">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`transition-colors duration-300 hover:text-cyan-300 ${
              isActive(item.to) ? "text-cyan-300" : ""
            }`}
            aria-current={isActive(item.to) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="text-white flex items-center space-x-4 text-sm mr-5">
        {admin?.email && (
          <span className="hidden md:block text-gray-400" title={admin.email}>
            {admin.email}
          </span>
        )}
        <motion.button
          onClick={handleLogout}
          className="cursor-pointer bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-2xl"
          initial={{ scale: 1 }}
          whileTap={{ scale: 0.95 }}
        >
          Logout
        </motion.button>
      </div>
    </div>
  );
};

export default NavbarAdmin;
