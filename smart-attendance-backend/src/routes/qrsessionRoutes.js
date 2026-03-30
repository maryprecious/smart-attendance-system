const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { Op } = require("sequelize");
const QRService = require("../services/qrService");
const { QRSession, User, AttendanceLog } = require("../models/dbassociation");
const { authenticateToken, authorizeRole } = require("../middlewares/auth");

const createQRSessionSchema = z.object({
  session_type: z.enum(["daily", "department", "event"]),
  department: z.string().optional(),
  event_name: z.string().optional(),
  subject_id: z.number().optional(),
  duration_minutes: z.number().min(1).max(480).default(30),
  max_scans: z.number().min(1).default(1000),
});

const validateQRCodeSchema = z.object({
  encrypted_qr_data: z.string().min(1),
  device_info: z
    .object({
      userAgent: z.string().optional(),
      ipAddress: z.string().optional(),
    })
    .optional(),
});

const regenerateQRSchema = z.object({
  session_id: z.number(),
});

router.post(
  "/",
  authenticateToken,
  authorizeRole("admin", "staff"),
  async (req, res) => {
    try {
      const data = createQRSessionSchema.parse(req.body);

      if (data.session_type === "department" && !data.department) {
        return res.status(400).json({
          success: false,
          message: "Department is required for department session type",
        });
      }

      if (data.session_type === "event" && !data.event_name) {
        return res.status(400).json({
          success: false,
          message: "Event name is required for event session type",
        });
      }

      const qrSession = await QRSession.create({
        session_type: data.session_type,
        department: data.department || null,
        event_name: data.event_name || null,
        subject_id: data.subject_id || null,
        created_by: req.user.id,
        is_active: true,
        valid_from: new Date(),
        expires_at: new Date(Date.now() + data.duration_minutes * 60 * 1000),
        max_scans: data.max_scans,
        scans_count: 0,
      });

      const qrData = await QRService.generateCompleteQRSession(
        qrSession.id,
        req.user.id,
        data.duration_minutes,
        process.env.QR_ENCRYPTION_KEY || "default-secret-key",
      );

      qrSession.regeneration_token = qrData.regenerationToken;
      await qrSession.save();

      res.status(201).json({
        success: true,
        message: "QR session created successfully",
        qrSession: {
          id: qrSession.id,
          session_type: qrSession.session_type,
          department: qrSession.department,
          event_name: qrSession.event_name,
          created_by: qrSession.created_by,
          is_active: qrSession.is_active,
          expires_at: qrSession.expires_at,
        },
        qr: {
          qrImage: qrData.qrImage,
          qrData: qrData.qrData,
          expiresAt: qrData.expiresAt,
        },
      });
    } catch (err) {
      console.error("Create QR session error:", err);
      if (err.name === "ZodError") {
        return res.status(400).json({
          success: false,
          message: err.errors[0].message,
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to create QR session",
      });
    }
  },
);

router.get("/:session_id", authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.session_id);

    const qrSession = await QRSession.findByPk(sessionId, {
      attributes: [
        "id",
        "session_type",
        "department",
        "event_name",
        "subject_id",
        "created_by",
        "is_active",
        "valid_from",
        "expires_at",
        "scans_count",
        "max_scans",
        "createdAt",
      ],
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "username", "email"],
        },
      ],
    });

    if (!qrSession) {
      return res.status(404).json({
        success: false,
        message: "QR session not found",
      });
    }

    const isExpired = QRService.isExpired(qrSession.expires_at);

    res.json({
      success: true,
      qrSession: {
        ...qrSession.toJSON(),
        isExpired,
        scanProgress: `${qrSession.scans_count}/${qrSession.max_scans}`,
      },
    });
  } catch (err) {
    console.error("Get QR session error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch QR session",
    });
  }
});

router.get(
  "/",
  authenticateToken,
  authorizeRole("admin", "staff"),
  async (req, res) => {
    try {
      const {
        session_type,
        department,
        is_active,
        page = 1,
        limit = 10,
      } = req.query;

      const whereClause = {};
      if (session_type) whereClause.session_type = session_type;
      if (department) whereClause.department = department;
      if (is_active !== undefined) whereClause.is_active = is_active === "true";

      const offset = (page - 1) * limit;

      const { count, rows: sessions } = await QRSession.findAndCountAll({
        where: whereClause,
        attributes: [
          "id",
          "session_type",
          "department",
          "event_name",
          "created_by",
          "is_active",
          "valid_from",
          "expires_at",
          "scans_count",
          "max_scans",
          "createdAt",
        ],
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "username", "email"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      res.json({
        success: true,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
        sessions: sessions.map((s) => ({
          ...s.toJSON(),
          isExpired: QRService.isExpired(s.expires_at),
          scanProgress: `${s.scans_count}/${s.max_scans}`,
        })),
      });
    } catch (err) {
      console.error("List QR sessions error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch QR sessions",
      });
    }
  },
);

router.post("/validate/code", authenticateToken, async (req, res) => {
  try {
    const data = validateQRCodeSchema.parse(req.body);

    let payload;
    try {
      payload = QRService.decryptQRPayload(
        data.encrypted_qr_data,
        process.env.QR_ENCRYPTION_KEY || "default-secret-key",
      );
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid or corrupted QR code",
      });
    }

    if (!QRService.validatePayloadStructure(payload)) {
      return res.status(400).json({
        success: false,
        message: "Invalid QR payload structure",
      });
    }

    const qrSession = await QRSession.findByPk(payload.sessionId);
    if (!qrSession) {
      return res.status(404).json({
        success: false,
        message: "QR session not found",
      });
    }

    if (!qrSession.is_active) {
      return res.status(410).json({
        success: false,
        message: "QR session is no longer active",
      });
    }

    if (QRService.isExpired(qrSession.expires_at)) {
      return res.status(410).json({
        success: false,
        message: "QR code has expired",
        expiresAt: qrSession.expires_at,
      });
    }

    if (qrSession.scans_count >= qrSession.max_scans) {
      return res.status(429).json({
        success: false,
        message: "Maximum scans reached for this QR session",
      });
    }

    const recentScan = await AttendanceLog.findOne({
      where: {
        user_id: req.user.id,
        qr_session_id: qrSession.id,
        scan_time: {
          [Op.gte]: new Date(Date.now() - 5 * 1000),
        },
      },
    });

    if (recentScan) {
      return res.status(429).json({
        success: false,
        message: "Duplicate scan detected. Please wait before scanning again.",
        lastScan: recentScan.scan_time,
      });
    }

    res.json({
      success: true,
      message: "QR code is valid",
      qrSession: {
        id: qrSession.id,
        session_type: qrSession.session_type,
        department: qrSession.department,
        event_name: qrSession.event_name,
        created_by: qrSession.created_by,
        expires_at: qrSession.expires_at,
        scans_count: qrSession.scans_count,
        max_scans: qrSession.max_scans,
      },
      validation: {
        isValid: true,
        isExpired: false,
        isDuplicate: false,
        readyForAttendance: true,
      },
    });
  } catch (err) {
    console.error("Validate QR error:", err);
    if (err.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: err.errors[0].message,
      });
    }
    res.status(500).json({
      success: false,
      message: "QR validation failed",
    });
  }
});

router.post(
  "/regenerate",
  authenticateToken,
  authorizeRole("admin", "staff"),
  async (req, res) => {
    try {
      const data = regenerateQRSchema.parse(req.body);

      const qrSession = await QRSession.findByPk(data.session_id);
      if (!qrSession) {
        return res.status(404).json({
          success: false,
          message: "QR session not found",
        });
      }

      if (qrSession.created_by !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "You cannot regenerate this QR session",
        });
      }

      const duration = Math.floor((qrSession.expires_at - Date.now()) / 60000);
      const newQRData = await QRService.generateCompleteQRSession(
        qrSession.id,
        req.user.id,
        Math.max(duration, 5),
        process.env.QR_ENCRYPTION_KEY || "default-secret-key",
      );

      qrSession.regeneration_token = newQRData.regenerationToken;
      qrSession.regenerated_at = new Date();
      await qrSession.save();

      res.json({
        success: true,
        message: "QR code regenerated successfully",
        qr: {
          qrImage: newQRData.qrImage,
          qrData: newQRData.qrData,
          regeneratedAt: qrSession.regenerated_at,
          expiresAt: newQRData.expiresAt,
        },
      });
    } catch (err) {
      console.error("Regenerate QR error:", err);
      if (err.name === "ZodError") {
        return res.status(400).json({
          success: false,
          message: err.errors[0].message,
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to regenerate QR code",
      });
    }
  },
);

router.patch(
  "/:session_id/stop",
  authenticateToken,
  authorizeRole("admin", "staff"),
  async (req, res) => {
    try {
      const sessionId = parseInt(req.params.session_id);

      const qrSession = await QRSession.findByPk(sessionId);
      if (!qrSession) {
        return res.status(404).json({
          success: false,
          message: "QR session not found",
        });
      }

      if (qrSession.created_by !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "You cannot stop this QR session",
        });
      }

      qrSession.is_active = false;
      qrSession.stopped_at = new Date();
      await qrSession.save();

      res.json({
        success: true,
        message: "QR session stopped successfully",
        qrSession: {
          id: qrSession.id,
          is_active: qrSession.is_active,
          stopped_at: qrSession.stopped_at,
          total_scans: qrSession.scans_count,
        },
      });
    } catch (err) {
      console.error("Stop QR session error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to stop QR session",
      });
    }
  },
);

router.get(
  "/:session_id/stats",
  authenticateToken,
  authorizeRole("admin", "staff"),
  async (req, res) => {
    try {
      const sessionId = parseInt(req.params.session_id);

      const qrSession = await QRSession.findByPk(sessionId);
      if (!qrSession) {
        return res.status(404).json({
          success: false,
          message: "QR session not found",
        });
      }

      const logs = await AttendanceLog.findAll({
        where: { qr_session_id: sessionId },
        include: [
          {
            model: User,
            attributes: ["id", "username", "email"],
          },
        ],
        order: [["scan_time", "DESC"]],
      });

      const stats = {
        totalScans: logs.length,
        present: logs.filter((l) => l.status === "present").length,
        late: logs.filter((l) => l.status === "late").length,
        absent: logs.filter((l) => l.status === "absent").length,
        uniqueUsers: new Set(logs.map((l) => l.user_id)).size,
      };

      res.json({
        success: true,
        qrSession: {
          id: qrSession.id,
          session_type: qrSession.session_type,
          department: qrSession.department,
          event_name: qrSession.event_name,
          is_active: qrSession.is_active,
          expires_at: qrSession.expires_at,
        },
        statistics: stats,
        attendanceLogs: logs.map((log) => ({
          id: log.id,
          user: log.User,
          status: log.status,
          scan_time: log.scan_time,
          latitude: log.latitude,
          longitude: log.longitude,
        })),
      });
    } catch (err) {
      console.error("Get QR stats error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch QR session statistics",
      });
    }
  },
);

module.exports = router;
