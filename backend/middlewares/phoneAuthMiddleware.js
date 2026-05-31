const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

// Only users with role "vansh" or "dev" can access phone business routes
const protectVansh = (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const allowedRoles = ["vansh", "dev"];
      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      req.userRole = decoded.role;
      next();
    } catch (err) {
      return res.status(401).json({ message: "Token invalid" });
    }
  } else {
    return res.status(401).json({ message: "No token" });
  }
};

module.exports = protectVansh;