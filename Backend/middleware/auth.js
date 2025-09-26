const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  const rawToken = req.headers.authorization;

  if (!rawToken) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const splitToken = rawToken.split(" ");
  const token = splitToken[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Decoded token:", decoded);
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    return res.status(403).json({ error: "Invalid token" });
  }
}

module.exports = authMiddleware;
