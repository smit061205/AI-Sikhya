const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

function adminAuthMiddleware(req, res, next) {
  const rawToken = req.headers.authorization;

  if (!rawToken || !rawToken.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = rawToken.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if the token is for an admin (assuming admin tokens have a specific property)
    if (!decoded.adminId) {
      return res.status(403).json({ error: "Forbidden. Not an admin token." });
    }

    req.adminId = decoded.adminId;
    req.adminEmail = decoded.email;
    next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    return res.status(403).json({ error: "Invalid token" });
  }
}

module.exports = adminAuthMiddleware;
