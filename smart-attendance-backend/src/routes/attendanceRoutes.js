const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { Op } = require("sequelize");
const QRService = require("../services/qrService");
const {
  AttendanceLog,
  QRSession,
  User,
  AuditLog,
} = require("../models/dbassociation");
const { authenticateToken, authorizeRole } = require("../middlewares/auth");

const markAttendanceSchema = z.object({
  encrypted_qr_data: z.string().min(1, "QR data is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  device_fingerprint: z.string().optional(),
});

const batchMarkAttendanceSchema = z.array(
  z.object({
    user_id: z.number(),
    qr_session_id: z.number(),
    status: z.enum(["present", "late", "absent"]).optional().default("present"),
    reason: z.string().optional(),
  }),
);

const getHistorySchema = z.object({
  user_id: z.string().optional(),
  session_type: z.enum(["daily", "department", "event"]).optional(),
  status: z.enum(["present", "late", "absent"]).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const calculateAttendanceStatus = (qrSession, scanTime) => {
  const validFrom = new Date(qrSession.valid_from);
  const gracePeriod = 15 * 60 * 1000;
  const lateThreshold = new Date(validFrom.getTime() + gracePeriod);

  return scanTime > lateThreshold ? "late" : "present";
};

const generateAttendanceCSV = (logs, statistics) => {
  const headers = [
    "ID",
    "Username",
    "Email",
    "Status",
    "Scan Time",
    "Session Type",
    "Department",
    "Event",
    "Latitude",
    "Longitude",
    "Device Info",
  ];

  const rows = logs.map((log) => [
    log.id,
    log.User?.username || "N/A",
    log.User?.email || "N/A",
    log.status,
    log.scan_time,
    log.qrSession?.session_type || "N/A",
    log.qrSession?.department || "N/A",
    log.qrSession?.event_name || "N/A",
    log.latitude || "",
    log.longitude || "",
    log.device_info || "Unknown",
  ]);

  const csvContent = [
    headers.join(","),
    `"Statistics:","Present: ${statistics.present}","Late: ${statistics.late}","Absent: ${statistics.absent}","Rate: ${statistics.attendanceRate}%"`,
    "",
    ...rows.map((row) =>
      row
        .map((cell) => {
          const escaped = String(cell || "").replace(/"/g, '""');
          return escaped.includes(",") || escaped.includes('"')
            ? `"${escaped}"`
            : escaped;
        })
        .join(","),
    ),
  ].join("\n");

  return csvContent;
};

const createDeviceFingerprint = (req, customFingerprint) => {
  if (customFingerprint) return customFingerprint;

  const crypto = require("crypto");
  const fingerprint = `${req.ip}-${req.headers["user-agent"]}-${req.headers["accept-language"]}`;
  return crypto.createHash("sha256").update(fingerprint).digest("hex");
};

const checkScreenshotReuse = async (qrSessionId, userId, deviceFingerprint) => {
  const recentScan = await AttendanceLog.findOne({
    where: {
      user_id: userId,
      qr_session_id: qrSessionId,
      device_fingerprint: deviceFingerprint,
      scan_time: {
        [Op.gte]: new Date(Date.now() - 5000),
      },
    },
  });

  return !!recentScan;
};

router.post("/mark", authenticateToken, async (req, res) => {
  try {
    const data = markAttendanceSchema.parse(req.body);
    const userId = req.user.id;
    const scanTime = new Date();
    const deviceFingerprint = createDeviceFingerprint(
      req,
      data.device_fingerprint,
    );

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
        error: "QR_DECRYPT_FAILED",
      });
    }

    if (!QRService.validatePayloadStructure(payload)) {
      return res.status(400).json({
        success: false,
        message: "Invalid QR payload structure",
        error: "INVALID_QR_STRUCTURE",
      });
    }

    const qrSession = await QRSession.findByPk(payload.sessionId);
    if (!qrSession) {
      return res.status(404).json({
        success: false,
        message: "QR session not found",
        error: "SESSION_NOT_FOUND",
      });
    }

    if (!qrSession.is_active) {
      return res.status(410).json({
        success: false,
        message: "This QR session has been deactivated",
        error: "SESSION_INACTIVE",
      });
    }

    if (QRService.isExpired(qrSession.expires_at)) {
      return res.status(410).json({
        success: false,
        message: "This QR code has expired",
        error: "QR_EXPIRED",
        expiresAt: qrSession.expires_at,
      });
    }

    const recentDuplicate = await AttendanceLog.findOne({
      where: {
        user_id: userId,
        qr_session_id: qrSession.id,
        scan_time: {
          [Op.gte]: new Date(Date.now() - 5000),
        },
      },
    });

    if (recentDuplicate) {
      return res.status(429).json({
        success: false,
        message: "Duplicate scan detected. Please wait before scanning again.",
        error: "DUPLICATE_SCAN",
        lastScan: recentDuplicate.scan_time,
      });
    }

    const existingAttendance = await AttendanceLog.findOne({
      where: {
        user_id: userId,
        qr_session_id: qrSession.id,
      },
    });

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        message: "You have already marked attendance for this session",
        error: "ALREADY_MARKED",
        existing_attendance: {
          scan_time: existingAttendance.scan_time,
          status: existingAttendance.status,
        },
      });
    }

    const screenshotReuse = await checkScreenshotReuse(
      qrSession.id,
      userId,
      deviceFingerprint,
    );
    if (screenshotReuse) {
      await AuditLog.create({
        action: "ATTENDANCE_SCREENSHOT_REUSE_DETECTED",
        user_id: userId,
        details: {
          qr_session_id: qrSession.id,
          device_fingerprint: deviceFingerprint,
          timestamp: scanTime,
        },
      });

      return res.status(429).json({
        success: false,
        message:
          "Screenshot reuse detected on this device. Please scan the QR code again.",
        error: "SCREENSHOT_REUSE",
      });
    }

    if (qrSession.scans_count >= qrSession.max_scans) {
      return res.status(429).json({
        success: false,
        message: "This QR session has reached maximum scan limit",
        error: "MAX_SCANS_REACHED",
      });
    }

    const status = calculateAttendanceStatus(qrSession, scanTime);

    const attendanceLog = await AttendanceLog.create({
      user_id: userId,
      qr_session_id: qrSession.id,
      scan_time: scanTime,
      status: status,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      ip_address: req.ip || req.connection.remoteAddress,
      device_info: req.headers["user-agent"] || "Unknown",
      device_fingerprint: deviceFingerprint,
      is_valid: true,
    });

    qrSession.scans_count += 1;
    await qrSession.save();

    await AuditLog.create({
      action: "ATTENDANCE_MARKED",
      user_id: userId,
      details: {
        attendance_log_id: attendanceLog.id,
        qr_session_id: qrSession.id,
        status: status,
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });

    res.status(201).json({
      success: true,
      message:
        status === "present"
          ? "Attendance marked successfully ✓"
          : "Attendance marked as late ⏰",
      attendance: {
        id: attendanceLog.id,
        status: attendanceLog.status,
        scan_time: attendanceLog.scan_time,
        session_type: qrSession.session_type,
        department: qrSession.department,
        event_name: qrSession.event_name,
        scans_remaining: qrSession.max_scans - qrSession.scans_count,
      },
    });
  } catch (err) {
    console.error("Mark attendance error:", err);
    if (err.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: err.errors[0].message,
        error: "VALIDATION_ERROR",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to mark attendance",
      error: "SERVER_ERROR",
    });
  }
});

router.post(
  "/batch-mark",
  authenticateToken,
  authorizeRole("admin", "staff"),
  async (req, res) => {
    try {
      const records = batchMarkAttendanceSchema.parse(req.body);

      if (records.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No attendance records provided",
        });
      }

      const results = {
        success: [],
        failed: [],
      };

      for (let i = 0; i < records.length; i++) {
        try {
          const record = records[i];

          const user = await User.findByPk(record.user_id);
          if (!user) {
            results.failed.push({
              index: i,
              user_id: record.user_id,
              error: "User not found",
            });
            continue;
          }

          const qrSession = await QRSession.findByPk(record.qr_session_id);
          if (!qrSession) {
            results.failed.push({
              index: i,
              qr_session_id: record.qr_session_id,
              error: "QR session not found",
            });
            continue;
          }

          const existing = await AttendanceLog.findOne({
            where: {
              user_id: record.user_id,
              qr_session_id: record.qr_session_id,
            },
          });

          if (existing) {
            results.failed.push({
              index: i,
              user_id: record.user_id,
              error: "Already marked",
            });
            continue;
          }

          const log = await AttendanceLog.create({
            user_id: record.user_id,
            qr_session_id: record.qr_session_id,
            scan_time: new Date(),
            status: record.status || "present",
            is_valid: true,
            ip_address: req.ip,
            device_info: "Batch Admin Upload",
          });

          await AuditLog.create({
            action: "BATCH_ATTENDANCE_MARKED",
            user_id: req.user.id,
            details: {
              marked_user_id: record.user_id,
              qr_session_id: record.qr_session_id,
              status: record.status,
              reason: record.reason,
              admin_id: req.user.id,
            },
          });

          results.success.push({
            index: i,
            user_id: record.user_id,
            attendance_id: log.id,
            status: log.status,
          });
        } catch (err) {
          results.failed.push({
            index: i,
            error: err.message,
          });
        }
      }

      res.status(201).json({
        success: results.failed.length === 0,
        message: `Processed ${records.length} records: ${results.success.length} created, ${results.failed.length} failed`,
        results,
      });
    } catch (err) {
      console.error("Batch mark attendance error:", err);
      if (err.name === "ZodError") {
        return res.status(400).json({
          success: false,
          message: err.errors[0].message,
        });
      }
      res.status(500).json({
        success: false,
        message: "Batch attendance marking failed",
      });
    }
  },
);

router.get("/history", authenticateToken, async (req, res) => {
  try {
    const {
      user_id,
      session_type,
      status,
      department,
      start_date,
      end_date,
      sort_by = "scan_time",
      order = "DESC",
      page = 1,
      limit = 20,
      export_format,
    } = req.query;

    let targetUserId = req.user.id;
    if (req.user.role !== "member" && user_id) {
      targetUserId = parseInt(user_id);
    } else if (
      req.user.role === "member" &&
      user_id &&
      parseInt(user_id) !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own attendance history",
      });
    }

    const whereClause = { user_id: targetUserId };

    if (status && ["present", "late", "absent"].includes(status)) {
      whereClause.status = status;
    }

    if (start_date || end_date) {
      whereClause.scan_time = {};
      if (start_date) {
        whereClause.scan_time[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        const endOfDay = new Date(end_date);
        endOfDay.setHours(23, 59, 59, 999);
        whereClause.scan_time[Op.lte] = endOfDay;
      }
    }

    const qrSessionWhere = {};
    if (
      session_type &&
      ["daily", "department", "event"].includes(session_type)
    ) {
      qrSessionWhere.session_type = session_type;
    }
    if (department) {
      qrSessionWhere.department = department;
    }

    const validSortFields = ["scan_time", "status", "id"];
    const sortField = validSortFields.includes(sort_by) ? sort_by : "scan_time";
    const sortOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows: attendanceLogs } = await AttendanceLog.findAndCountAll(
      {
        where: whereClause,
        include: [
          {
            model: QRSession,
            as: "qrSession",
            where: qrSessionWhere,
            attributes: [
              "id",
              "session_type",
              "department",
              "event_name",
              "valid_from",
              "expires_at",
              "created_by",
            ],
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "username", "email", "role", "department"],
          },
        ],
        limit: limitNum,
        offset: offset,
        order: [[sortField, sortOrder]],
        subQuery: false,
        distinct: true,
      },
    );

    const allStats = await AttendanceLog.findAll({
      where: { user_id: targetUserId },
      attributes: ["status", [require("sequelize").fn("COUNT", "*"), "count"]],
      group: ["status"],
      raw: true,
    });

    const statistics = {
      total: allStats.reduce((sum, s) => sum + parseInt(s.count || 0), 0),
      present: parseInt(
        allStats.find((s) => s.status === "present")?.count || 0,
      ),
      late: parseInt(allStats.find((s) => s.status === "late")?.count || 0),
      absent: parseInt(allStats.find((s) => s.status === "absent")?.count || 0),
      attendanceRate:
        allStats.length > 0
          ? (
              (parseInt(
                allStats.find((s) => s.status === "present")?.count || 0,
              ) /
                parseInt(
                  allStats.find(
                    (s) => s.status === "present" || s.status === "late",
                  )?.count || 1,
                )) *
              100
            ).toFixed(2)
          : "0.00",
    };

    if (export_format === "csv") {
      const csv = generateAttendanceCSV(attendanceLogs, statistics);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=attendance_${targetUserId}_${new Date().toISOString().split("T")[0]}.csv`,
      );
      return res.send(csv);
    }

    res.json({
      success: true,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
        hasNextPage: pageNum < Math.ceil(count / limitNum),
        hasPrevPage: pageNum > 1,
      },
      filters: {
        user_id: targetUserId,
        status,
        session_type,
        department,
        start_date,
        end_date,
      },
      statistics,
      data: attendanceLogs.map((log) => ({
        id: log.id,
        user: log.User,
        status: log.status,
        scan_time: log.scan_time,
        latitude: log.latitude,
        longitude: log.longitude,
        device_info: log.device_info,
        session: {
          id: log.qrSession.id,
          type: log.qrSession.session_type,
          department: log.qrSession.department,
          event_name: log.qrSession.event_name,
        },
      })),
    });
  } catch (err) {
    console.error("Get attendance history error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance history",
    });
  }
});

router.get("/my-history", authenticateToken, async (req, res) => {
  try {
    const {
      status,
      session_type,
      start_date,
      end_date,
      page = 1,
      limit = 20,
      sort_by = "scan_time",
      order = "DESC",
    } = req.query;

    const whereClause = { user_id: req.user.id };

    if (status && ["present", "late", "absent"].includes(status)) {
      whereClause.status = status;
    }

    if (start_date || end_date) {
      whereClause.scan_time = {};
      if (start_date) whereClause.scan_time[Op.gte] = new Date(start_date);
      if (end_date) {
        const endOfDay = new Date(end_date);
        endOfDay.setHours(23, 59, 59, 999);
        whereClause.scan_time[Op.lte] = endOfDay;
      }
    }

    const qrSessionWhere = {};
    if (
      session_type &&
      ["daily", "department", "event"].includes(session_type)
    ) {
      qrSessionWhere.session_type = session_type;
    }

    const validSortFields = ["scan_time", "status", "id"];
    const sortField = validSortFields.includes(sort_by) ? sort_by : "scan_time";
    const sortOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows: attendanceLogs } = await AttendanceLog.findAndCountAll(
      {
        where: whereClause,
        include: [
          {
            model: QRSession,
            as: "qrSession",
            where: qrSessionWhere,
            attributes: [
              "id",
              "session_type",
              "department",
              "event_name",
              "valid_from",
            ],
          },
        ],
        limit: limitNum,
        offset: offset,
        order: [[sortField, sortOrder]],
        subQuery: false,
        distinct: true,
      },
    );

    const stats = await AttendanceLog.findAll({
      where: { user_id: req.user.id },
      attributes: ["status", [require("sequelize").fn("COUNT", "*"), "count"]],
      group: ["status"],
      raw: true,
    });

    const statistics = {
      total: stats.reduce((sum, s) => sum + parseInt(s.count || 0), 0),
      present: parseInt(stats.find((s) => s.status === "present")?.count || 0),
      late: parseInt(stats.find((s) => s.status === "late")?.count || 0),
      absent: parseInt(stats.find((s) => s.status === "absent")?.count || 0),
      attendanceRate:
        stats.length > 0
          ? (
              (parseInt(stats.find((s) => s.status === "present")?.count || 0) /
                (parseInt(
                  stats.find((s) => s.status === "present")?.count || 0,
                ) +
                  parseInt(
                    stats.find((s) => s.status === "late")?.count || 0,
                  ))) *
              100
            ).toFixed(2)
          : "0.00",
    };

    res.json({
      success: true,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
        hasNextPage: pageNum < Math.ceil(count / limitNum),
        hasPrevPage: pageNum > 1,
      },
      filters: {
        status,
        session_type,
        start_date,
        end_date,
      },
      statistics,
      data: attendanceLogs.map((log) => ({
        id: log.id,
        status: log.status,
        scan_time: log.scan_time,
        latitude: log.latitude,
        longitude: log.longitude,
        device_info: log.device_info,
        session: {
          id: log.qrSession.id,
          type: log.qrSession.session_type,
          department: log.qrSession.department,
          event_name: log.qrSession.event_name,
        },
      })),
    });
  } catch (err) {
    console.error("Get my history error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your attendance history",
    });
  }
});

router.get(
  "/stats",
  authenticateToken,
  authorizeRole("admin", "staff"),
  async (req, res) => {
    try {
      const { session_type, department, start_date, end_date } = req.query;

      const whereClause = {};
      if (start_date || end_date) {
        whereClause.scan_time = {};
        if (start_date) whereClause.scan_time[Op.gte] = new Date(start_date);
        if (end_date) whereClause.scan_time[Op.lte] = new Date(end_date);
      }

      const qrSessionWhere = {};
      if (session_type) qrSessionWhere.session_type = session_type;
      if (department) qrSessionWhere.department = department;

      const totalAttendance = await AttendanceLog.count({
        where: whereClause,
        include: [
          {
            model: QRSession,
            as: "qrSession",
            where: qrSessionWhere,
            attributes: [],
          },
        ],
      });

      const statusBreakdown = await AttendanceLog.findAll({
        where: whereClause,
        include: [
          {
            model: QRSession,
            as: "qrSession",
            where: qrSessionWhere,
            attributes: [],
          },
        ],
        attributes: [
          "status",
          [require("sequelize").fn("COUNT", "status"), "count"],
        ],
        group: ["status"],
        raw: true,
      });

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const dailyTrend = await AttendanceLog.findAll({
        where: {
          scan_time: { [Op.gte]: sevenDaysAgo },
        },
        attributes: [
          [
            require("sequelize").fn(
              "DATE",
              require("sequelize").col("scan_time"),
            ),
            "date",
          ],
          [require("sequelize").fn("COUNT", "*"), "count"],
        ],
        group: ["date"],
        order: [["date", "ASC"]],
        raw: true,
      });

      res.json({
        success: true,
        statistics: {
          total: totalAttendance,
          present:
            statusBreakdown.find((s) => s.status === "present")?.count || 0,
          late: statusBreakdown.find((s) => s.status === "late")?.count || 0,
          absent:
            statusBreakdown.find((s) => s.status === "absent")?.count || 0,
        },
        dailyTrend,
      });
    } catch (err) {
      console.error("Get stats error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch attendance statistics",
      });
    }
  },
);

router.get(
  "/:id",
  authenticateToken,
  authorizeRole("admin", "staff"),
  async (req, res) => {
    try {
      const attendanceLog = await AttendanceLog.findByPk(req.params.id, {
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "username", "email", "role", "department"],
          },
          {
            model: QRSession,
            as: "qrSession",
            attributes: [
              "id",
              "session_code",
              "session_type",
              "department",
              "event_name",
            ],
          },
        ],
      });

      if (!attendanceLog) {
        return res.status(404).json({
          success: false,
          message: "Attendance log not found",
        });
      }

      res.json({
        success: true,
        attendanceLog,
      });
    } catch (err) {
      console.error("Get attendance log error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch attendance log",
      });
    }
  },
);

router.get(
  "/department/report",
  authenticateToken,
  authorizeRole("admin", "staff"),
  async (req, res) => {
    try {
      const {
        department,
        start_date,
        end_date,
        page = 1,
        limit = 50,
      } = req.query;

      if (!department) {
        return res.status(400).json({
          success: false,
          message: "Department is required",
        });
      }

      const whereClause = {};
      if (start_date || end_date) {
        whereClause.scan_time = {};
        if (start_date) whereClause.scan_time[Op.gte] = new Date(start_date);
        if (end_date) {
          const endOfDay = new Date(end_date);
          endOfDay.setHours(23, 59, 59, 999);
          whereClause.scan_time[Op.lte] = endOfDay;
        }
      }

      const qrSessionWhere = { department };

      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
      const offset = (pageNum - 1) * limitNum;

      const { count, rows: logs } = await AttendanceLog.findAndCountAll({
        include: [
          {
            model: QRSession,
            as: "qrSession",
            where: qrSessionWhere,
            attributes: ["id", "session_type", "department", "event_name"],
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "username", "email", "department"],
          },
        ],
        where: whereClause,
        limit: limitNum,
        offset: offset,
        order: [["scan_time", "DESC"]],
        subQuery: false,
        distinct: true,
      });

      const stats = await AttendanceLog.findAll({
        include: [
          {
            model: QRSession,
            as: "qrSession",
            where: qrSessionWhere,
            attributes: [],
          },
        ],
        where: whereClause,
        attributes: [
          "status",
          [require("sequelize").fn("COUNT", "*"), "count"],
        ],
        group: ["status"],
        raw: true,
      });

      const perUserStats = await AttendanceLog.findAll({
        include: [
          {
            model: QRSession,
            as: "qrSession",
            where: qrSessionWhere,
            attributes: [],
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "username", "email"],
          },
        ],
        where: whereClause,
        attributes: [
          "user_id",
          "status",
          [require("sequelize").fn("COUNT", "*"), "count"],
        ],
        group: ["user_id", "status"],
        raw: true,
      });

      res.json({
        success: true,
        department,
        pagination: {
          total: count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(count / limitNum),
        },
        statistics: {
          total: stats.reduce((sum, s) => sum + parseInt(s.count || 0), 0),
          present: parseInt(
            stats.find((s) => s.status === "present")?.count || 0,
          ),
          late: parseInt(stats.find((s) => s.status === "late")?.count || 0),
          absent: parseInt(
            stats.find((s) => s.status === "absent")?.count || 0,
          ),
        },
        data: logs.map((log) => ({
          id: log.id,
          user: log.User,
          status: log.status,
          scan_time: log.scan_time,
          session: log.qrSession,
        })),
        perUserSummary: perUserStats,
      });
    } catch (err) {
      console.error("Department report error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch department report",
      });
    }
  },
);

module.exports = router;
