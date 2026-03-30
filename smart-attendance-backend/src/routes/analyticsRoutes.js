const express = require("express");
const router = express.Router();
const { Op, fn, col } = require("sequelize");
const { AttendanceLog, User, QRSession } = require("../models/dbassociation");
const { authenticateToken, authorizeRole } = require("../middlewares/auth");

const generateDateRange = (days = 7) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return { startDate, endDate };
};

const formatAnalytics = (data) => {
  return {
    total: data.reduce((sum, item) => sum + parseInt(item.count || 0), 0),
    present: parseInt(data.find((d) => d.status === "present")?.count || 0),
    late: parseInt(data.find((d) => d.status === "late")?.count || 0),
    absent: parseInt(data.find((d) => d.status === "absent")?.count || 0),
  };
};

router.get(
  "/dashboard",
  authenticateToken,
  authorizeRole("admin", "staff"),
  async (req, res) => {
    try {
      const { start_date, end_date, days = 7 } = req.query;

      let startDate, endDate;
      if (start_date && end_date) {
        startDate = new Date(start_date);
        endDate = new Date(end_date);
        endDate.setHours(23, 59, 59, 999);
      } else {
        const range = generateDateRange(parseInt(days));
        startDate = range.startDate;
        endDate = range.endDate;
      }

      const dateFilter = {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      };

      const overallStats = await AttendanceLog.findAll({
        where: { scan_time: dateFilter },
        attributes: ["status", [fn("COUNT", col("status")), "count"]],
        group: ["status"],
        raw: true,
      });

      const overall = formatAnalytics(overallStats);

      const dailyTrend = await AttendanceLog.findAll({
        where: { scan_time: dateFilter },
        attributes: [
          [fn("DATE", col("scan_time")), "date"],
          "status",
          [fn("COUNT", "*"), "count"],
        ],
        group: ["date", "status"],
        order: [["date", "ASC"]],
        raw: true,
      });

      const formattedDailyTrend = {};
      dailyTrend.forEach((item) => {
        if (!formattedDailyTrend[item.date]) {
          formattedDailyTrend[item.date] = {
            date: item.date,
            present: 0,
            late: 0,
            absent: 0,
            total: 0,
          };
        }
        formattedDailyTrend[item.date][item.status] = parseInt(item.count);
        formattedDailyTrend[item.date].total += parseInt(item.count);
      });

      const totalUsers = await User.count();
      const staffUsers = await User.count({ where: { role: "staff" } });
      const memberUsers = await User.count({ where: { role: "member" } });

      const mostActiveDays = await AttendanceLog.findAll({
        where: { scan_time: dateFilter },
        attributes: [
          [fn("DAYNAME", col("scan_time")), "day_name"],
          [fn("COUNT", "*"), "count"],
        ],
        group: ["day_name"],
        order: [[fn("COUNT", "*"), "DESC"]],
        limit: 7,
        raw: true,
      });

      const userAttendanceStats = await AttendanceLog.findAll({
        where: { scan_time: dateFilter },
        attributes: ["user_id", [fn("COUNT", "*"), "total"]],
        group: ["user_id"],
        raw: true,
      });

      const averageAttendancePerUser =
        userAttendanceStats.length > 0
          ? (
              userAttendanceStats.reduce(
                (sum, stat) => sum + parseInt(stat.total),
                0,
              ) / userAttendanceStats.length
            ).toFixed(2)
          : "0.00";

      res.json({
        success: true,
        dateRange: {
          start: startDate,
          end: endDate,
          days: parseInt(days),
        },
        overview: {
          overall,
          totalAttendanceRecords: overall.total,
          presentRate: (
            (overall.present / Math.max(overall.total, 1)) *
            100
          ).toFixed(2),
          lateRate: ((overall.late / Math.max(overall.total, 1)) * 100).toFixed(
            2,
          ),
          absentRate: (
            (overall.absent / Math.max(overall.total, 1)) *
            100
          ).toFixed(2),
        },
        userMetrics: {
          totalUsers,
          staffUsers,
          memberUsers,
          averageAttendancePerUser,
        },
        trends: {
          dailyBreakdown: Object.values(formattedDailyTrend),
          mostActiveDays,
        },
      });
    } catch (err) {
      console.error("Dashboard error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard data",
      });
    }
  },
);

router.get(
  "/staff-vs-members",
  authenticateToken,
  authorizeRole("admin", "staff"),
  async (req, res) => {
    try {
      const { start_date, end_date, days = 7 } = req.query;

      let startDate, endDate;
      if (start_date && end_date) {
        startDate = new Date(start_date);
        endDate = new Date(end_date);
        endDate.setHours(23, 59, 59, 999);
      } else {
        const range = generateDateRange(parseInt(days));
        startDate = range.startDate;
        endDate = range.endDate;
      }

      const dateFilter = {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      };

      const staffAttendance = await AttendanceLog.findAll({
        include: [
          {
            model: User,
            as: "user",
            attributes: [],
            where: { role: "staff" },
          },
        ],
        where: { scan_time: dateFilter },
        attributes: ["status", [fn("COUNT", "*"), "count"]],
        group: ["status"],
        raw: true,
      });

      const memberAttendance = await AttendanceLog.findAll({
        include: [
          {
            model: User,
            as: "user",
            attributes: [],
            where: { role: "member" },
          },
        ],
        where: { scan_time: dateFilter },
        attributes: ["status", [fn("COUNT", "*"), "count"]],
        group: ["status"],
        raw: true,
      });

      const dailyComparison = await AttendanceLog.findAll({
        where: { scan_time: dateFilter },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["role"],
          },
        ],
        attributes: [
          [fn("DATE", col("scan_time")), "date"],
          "User.role",
          [fn("COUNT", "*"), "count"],
        ],
        group: ["date", "User.role"],
        order: [["date", "ASC"]],
        raw: true,
        subQuery: false,
      });

      const staffStats = formatAnalytics(staffAttendance);
      const memberStats = formatAnalytics(memberAttendance);

      res.json({
        success: true,
        dateRange: {
          start: startDate,
          end: endDate,
          days: parseInt(days),
        },
        comparison: {
          staff: {
            ...staffStats,
            presentRate: (
              (staffStats.present / Math.max(staffStats.total, 1)) *
              100
            ).toFixed(2),
            lateRate: (
              (staffStats.late / Math.max(staffStats.total, 1)) *
              100
            ).toFixed(2),
          },
          members: {
            ...memberStats,
            presentRate: (
              (memberStats.present / Math.max(memberStats.total, 1)) *
              100
            ).toFixed(2),
            lateRate: (
              (memberStats.late / Math.max(memberStats.total, 1)) *
              100
            ).toFixed(2),
          },
        },
        dailyComparison,
      });
    } catch (err) {
      console.error("Staff vs members error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch comparison data",
      });
    }
  },
);

router.get(
  "/department",
  authenticateToken,
  authorizeRole("admin", "staff"),
  async (req, res) => {
    try {
      const { start_date, end_date, days = 7, department } = req.query;

      let startDate, endDate;
      if (start_date && end_date) {
        startDate = new Date(start_date);
        endDate = new Date(end_date);
        endDate.setHours(23, 59, 59, 999);
      } else {
        const range = generateDateRange(parseInt(days));
        startDate = range.startDate;
        endDate = range.endDate;
      }

      const dateFilter = {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      };

      const qrSessionWhere = {};
      if (department) {
        qrSessionWhere.department = department;
      }

      const departments = await QRSession.findAll({
        attributes: [[fn("DISTINCT", col("department")), "department"]],
        where: { department: { [Op.ne]: null } },
        raw: true,
      });

      const departmentAnalytics = [];

      for (const dept of departments) {
        const deptName = dept.department;
        if (!deptName) continue;

        const stats = await AttendanceLog.findAll({
          where: { scan_time: dateFilter },
          include: [
            {
              model: QRSession,
              as: "qrSession",
              where: { department: deptName },
              attributes: [],
            },
          ],
          attributes: ["status", [fn("COUNT", "*"), "count"]],
          group: ["status"],
          raw: true,
        });

        const formatted = formatAnalytics(stats);
        departmentAnalytics.push({
          department: deptName,
          ...formatted,
          presentRate: (
            (formatted.present / Math.max(formatted.total, 1)) *
            100
          ).toFixed(2),
          lateRate: (
            (formatted.late / Math.max(formatted.total, 1)) *
            100
          ).toFixed(2),
        });
      }

      departmentAnalytics.sort((a, b) => b.total - a.total);

      res.json({
        success: true,
        dateRange: {
          start: startDate,
          end: endDate,
          days: parseInt(days),
        },
        departments: departmentAnalytics,
      });
    } catch (err) {
      console.error("Department analytics error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch department analytics",
      });
    }
  },
);

router.get(
  "/trends",
  authenticateToken,
  authorizeRole("admin", "staff"),
  async (req, res) => {
    try {
      const { period = "7" } = req.query;

      const periodDays = parseInt(period);
      if (![7, 30, 90].includes(periodDays)) {
        return res.status(400).json({
          success: false,
          message: "Period must be 7, 30, or 90",
        });
      }

      const range = generateDateRange(periodDays);
      const dateFilter = {
        [Op.gte]: range.startDate,
        [Op.lte]: range.endDate,
      };

      const weeklyTrend = await AttendanceLog.findAll({
        where: { scan_time: dateFilter },
        attributes: [
          [fn("DATE_TRUNC", "week", col("scan_time")), "week_start"],
          "status",
          [fn("COUNT", "*"), "count"],
        ],
        group: ["week_start", "status"],
        order: [["week_start", "ASC"]],
        raw: true,
      });

      const formattedWeekly = {};
      weeklyTrend.forEach((item) => {
        const weekKey = item.week_start;
        if (!formattedWeekly[weekKey]) {
          formattedWeekly[weekKey] = {
            week: weekKey,
            present: 0,
            late: 0,
            absent: 0,
            total: 0,
          };
        }
        formattedWeekly[weekKey][item.status] = parseInt(item.count);
        formattedWeekly[weekKey].total += parseInt(item.count);
      });

      const weeks = Object.values(formattedWeekly);
      let trendDirection = "stable";
      if (weeks.length > 1) {
        const firstWeekPresent = weeks[0].present;
        const lastWeekPresent = weeks[weeks.length - 1].present;
        if (lastWeekPresent > firstWeekPresent) {
          trendDirection = "improving";
        } else if (lastWeekPresent < firstWeekPresent) {
          trendDirection = "declining";
        }
      }

      const dailyStats = await AttendanceLog.findAll({
        where: { scan_time: dateFilter },
        attributes: [
          [fn("DATE", col("scan_time")), "date"],
          [fn("COUNT", "*"), "total"],
        ],
        group: ["date"],
        order: [[fn("COUNT", "*"), "DESC"]],
        raw: true,
      });

      const bestDays = dailyStats.slice(0, 5);
      const worstDays = dailyStats.slice(-5).reverse();

      res.json({
        success: true,
        period: `${periodDays} days`,
        dateRange: {
          start: range.startDate,
          end: range.endDate,
        },
        trendDirection,
        weeklyTrend: Object.values(formattedWeekly),
        peakDays: bestDays,
        slackDays: worstDays,
      });
    } catch (err) {
      console.error("Trends error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch trends data",
      });
    }
  },
);

router.get("/user/:user_id", authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.user_id);

    if (req.user.id !== userId && !["admin", "staff"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own analytics",
      });
    }

    const { start_date, end_date, days = 30 } = req.query;

    let startDate, endDate;
    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const range = generateDateRange(parseInt(days));
      startDate = range.startDate;
      endDate = range.endDate;
    }

    const dateFilter = {
      [Op.gte]: startDate,
      [Op.lte]: endDate,
    };

    const user = await User.findByPk(userId, {
      attributes: ["id", "username", "email", "role", "department"],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const stats = await AttendanceLog.findAll({
      where: {
        user_id: userId,
        scan_time: dateFilter,
      },
      attributes: ["status", [fn("COUNT", "*"), "count"]],
      group: ["status"],
      raw: true,
    });

    const overall = formatAnalytics(stats);

    const dailyBreakdown = await AttendanceLog.findAll({
      where: {
        user_id: userId,
        scan_time: dateFilter,
      },
      attributes: [
        [fn("DATE", col("scan_time")), "date"],
        "status",
        [fn("COUNT", "*"), "count"],
      ],
      group: ["date", "status"],
      order: [["date", "DESC"]],
      raw: true,
    });

    const totalSessionDays = await QRSession.count({
      where: {
        created_at: dateFilter,
        is_active: true,
      },
    });

    const presentDays = dailyBreakdown
      .filter((d) => d.status === "present")
      .map((d) => d.date).length;

    const consistencyScore = totalSessionDays
      ? ((presentDays / totalSessionDays) * 100).toFixed(2)
      : "N/A";

    res.json({
      success: true,
      user,
      dateRange: {
        start: startDate,
        end: endDate,
        days: parseInt(days),
      },
      statistics: {
        ...overall,
        presentRate: (
          (overall.present / Math.max(overall.total, 1)) *
          100
        ).toFixed(2),
        lateRate: ((overall.late / Math.max(overall.total, 1)) * 100).toFixed(
          2,
        ),
        absentRate: (
          (overall.absent / Math.max(overall.total, 1)) *
          100
        ).toFixed(2),
        consistencyScore,
      },
      dailyBreakdown,
    });
  } catch (err) {
    console.error("User analytics error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user analytics",
    });
  }
});

router.get(
  "/export",
  authenticateToken,
  authorizeRole("admin", "staff"),
  async (req, res) => {
    try {
      const {
        start_date,
        end_date,
        days = 7,
        type = "daily",
      } = req.query;

      let startDate, endDate;
      if (start_date && end_date) {
        startDate = new Date(start_date);
        endDate = new Date(end_date);
        endDate.setHours(23, 59, 59, 999);
      } else {
        const range = generateDateRange(parseInt(days));
        startDate = range.startDate;
        endDate = range.endDate;
      }

      const dateFilter = {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      };

      let csvContent = "";
      let filename = `analytics_${type}_${new Date().toISOString().split("T")[0]}.csv`;

      if (type === "daily") {
        const dailyStats = await AttendanceLog.findAll({
          where: { scan_time: dateFilter },
          attributes: [
            [fn("DATE", col("scan_time")), "date"],
            "status",
            [fn("COUNT", "*"), "count"],
          ],
          group: ["date", "status"],
          order: [["date", "ASC"]],
          raw: true,
        });

        csvContent =
          "Date,Present,Late,Absent,Total\n" +
          dailyStats
            .map(
              (d) =>
                `${d.date},${d.status === "present" ? d.count : 0},${d.status === "late" ? d.count : 0},${d.status === "absent" ? d.count : 0}`,
            )
            .join("\n");
      } else if (type === "department") {
        const deptStats = await AttendanceLog.findAll({
          where: { scan_time: dateFilter },
          include: [
            {
              model: QRSession,
              as: "qrSession",
              attributes: ["department"],
            },
          ],
          attributes: [
            [col("qrSession.department"), "department"],
            "status",
            [fn("COUNT", "*"), "count"],
          ],
          group: ["qrSession.department", "status"],
          raw: true,
        });

        csvContent =
          "Department,Present,Late,Absent,Total\n" +
          deptStats
            .map((d) => `${d.department || "N/A"},${d.count}`)
            .join("\n");
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
      res.send(csvContent);
    } catch (err) {
      console.error("Export analytics error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to export analytics",
      });
    }
  },
);

module.exports = router;
