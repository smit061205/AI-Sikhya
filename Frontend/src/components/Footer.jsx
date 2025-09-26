import React from "react";

const Footer = () => {
  return (
    <div className="w-full bg-[#0D0D0D]">
      <div className="flex space-x-28 justify-center border-y-[1px] border-white py-3 w-full">
        <a
          href="https://www.linkedin.com/in/zappylearn-educo-ba96a1379/"
          className="text-white text-4xl hover:text-teal-200 transition-colors duration-300"
        >
          Linkedin
        </a>
        <a
          href="https://www.instagram.com/zappylearn/"
          className="text-white text-4xl hover:text-teal-200 transition-colors duration-300"
        >
          Instagram
        </a>
        <a
          href="https://www.facebook.com/profile.php?id=61579198051217"
          className="text-white text-4xl hover:text-teal-200 transition-colors duration-300"
        >
          Facebook
        </a>
        <a
          href="https://x.com/ZappyLearn"
          className="text-white text-4xl hover:text-teal-200 transition-colors duration-300"
        >
          X
        </a>
        <a
          href="mailto:zappylearn06@gmail.com"
          className="text-white text-4xl hover:text-teal-200 transition-colors duration-300"
        >
          Gmail
        </a>
      </div>
      <h1 className="text-white text-center mt-2 pb-4 font-extralight">
        © Zappylearn 2025
      </h1>
    </div>
  );
};

export default Footer;
