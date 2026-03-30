const express = require("express");
const router = express.Router();
const { z } = require("zod");
const jwt = require("jsonwebtoken");
const argon2 = require("argon2");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { User, Session } = require("../models/dbassociation");
const logger = require("../utils/logger");

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "staff", "member"]).optional().default("member"),
  department: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6),
  fcmToken: z.string().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || "15m" },
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d" },
  );

  return { accessToken, refreshToken };
};

router.post("/register", async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await User.findOne({
      where: {
        [Op.or]: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email or username already exists",
      });
    }

    const user = await User.create({
      username: data.username,
      email: data.email,
      passwordHash: data.password,
      role: data.role,
      department: data.department || null,
      isActive: true,
    });

    const { accessToken, refreshToken } = generateTokens(user);

    await Session.create({
      user_id: user.id,
      token_hash: hashToken(refreshToken),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ip_address: req.ip || req.connection.remoteAddress,
      device_info: req.headers["user-agent"] || "Unknown",
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    logger.error(`Registration error: ${err.message}`, { stack: err.stack });
    if (err.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: err.errors[0].message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, fcmToken } = loginSchema.parse(req.body);

    const user = await User.findOne({ where: { email } });
    if (!user) {
      logger.warn(`[LOGIN] User not found: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    logger.info(
      `[LOGIN] User found: ${user.email}, isActive: ${user.isActive}`,
    );

    if (!user.isActive) {
      logger.warn(`[LOGIN] User inactive: ${email}`);
      return res.status(403).json({
        success: false,
        message: "Your account is not active. Please contact an administrator.",
      });
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      logger.warn(`[LOGIN] Invalid password for: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    logger.info(`[LOGIN] Login successful: ${email}`);

    await Session.destroy({ where: { user_id: user.id } });

    const { accessToken, refreshToken } = generateTokens(user);

    await Session.create({
      user_id: user.id,
      token_hash: hashToken(refreshToken),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ip_address: req.ip || req.connection.remoteAddress,
      device_info: req.headers["user-agent"] || "Unknown",
    });

    if (fcmToken) {
      user.fcmToken = fcmToken;
      await user.save();
    }

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (err) {
    logger.error(`Login error: ${err.message}`, { stack: err.stack });
    if (err.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: err.errors[0].message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    const session = await Session.findOne({
      where: {
        user_id: decoded.id,
        token_hash: hashToken(refreshToken),
        expires_at: { [Op.gt]: new Date() },
      },
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session not found or expired",
      });
    }

    const user = await User.findByPk(session.user_id);
    if (!user || !user.isActive) {
      await session.destroy();
      return res.status(401).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    const { accessToken } = generateTokens(user);

    session.last_activity = new Date();
    await session.save();

    res.json({ success: true, accessToken });
  } catch (err) {
    logger.error(`Refresh error: ${err.message}`, { stack: err.stack });
    if (err.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: err.errors[0].message,
      });
    }
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token required",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    await Session.destroy({
      where: {
        user_id: decoded.id,
        token_hash: hashToken(refreshToken),
      },
    });

    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    logger.error(`Logout error: ${err.message}`, { stack: err.stack });
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
});

module.exports = router;
