import React from 'react';
import logoImage from "../assets/Screenshot 2025-08-06 at 1.17.37 AM.png";

const Logo = () => {
  return (
    <div className="relative w-12 h-12">
      <svg width="0" height="0">
        <defs>
          <clipPath id="logo-clip" clipPathUnits="objectBoundingBox">
            <path d="M0.116539 0.187984L0.782476 0.0130417C0.855312 -0.00976168 0.940747 -0.00595721 0.970812 0.0510676C0.993884 0.0948284 1.00203 0.135712 0.970812 0.188931L0.771031 0.487477L0.909421 0.564491C0.978095 0.601593 1.00609 0.643428 0.998905 0.703327C0.991033 0.768954 0.961446 0.793652 0.871961 0.820274L0.220591 0.987611C0.111335 1.01233 0.047614 0.998323 0.0249724 0.960967C-0.00540408 0.91085 -0.0133159 0.889933 0.0312152 0.81552L0.0978094 0.72137L0.240362 0.512197L0.116539 0.440889C0.0509847 0.405713 0.0352626 0.383845 0.0156077 0.339155C-0.00104165 0.301299 0.0228905 0.214605 0.116539 0.187984Z"></path>
          </clipPath>
        </defs>
      </svg>
      <img
        src={logoImage}
        alt="Logo"
        className="w-full h-full object-cover"
        style={{ clipPath: 'url(#logo-clip)' }}
      />
    </div>
  );
};

export default Logo;
