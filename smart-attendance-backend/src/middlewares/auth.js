const jwt = require("jsonwebtoken");
const { User } = require("../models/dbassociation");

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "access token is required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: ["id", "username", "email", "role", "isActive"],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User is not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "This account is inactive",
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error("Authentication error:", err);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "This access token is expired",
      });
    }

    return res.status(403).json({
      success: false,
      message: "Invalid access token",
    });
  }
};

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized! No such user found",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      });
    }

    next();
  };
};

const checkOwnership = (req, res, next) => {
  const userId = parseInt(req.params.id);

  if (req.user.role === "admin") {
    return next();
  }

  if (req.user.id !== userId) {
    return res.status(403).json({
      success: false,
      message: "You can only access your own resources",
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  authorizeRole,
  checkOwnership,
};
