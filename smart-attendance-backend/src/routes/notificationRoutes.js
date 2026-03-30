const express = require("express");
const router = express.Router();
const { Notification } = require("../models/dbassociation");
const { authenticateToken } = require("../middlewares/auth");

router.get("/", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unread_only } = req.query;

    const whereClause = { user_id: req.user.id };
    if (unread_only === "true") {
      whereClause.is_read = false;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["created_at", "DESC"]],
    });

    const unreadCount = await Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });

    res.json({
      success: true,
      data: rows,
      meta: {
        total: count,
        unreadCount,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
});

router.patch("/:id/read", authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const notification = await Notification.findOne({
      where: { id: notificationId, user_id: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.is_read = true;
    notification.read_at = new Date();
    await notification.save();

    res.json({
      success: true,
      message: "Marked as read",
    });
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update notification",
    });
  }
});

router.patch("/read-all", authenticateToken, async (req, res) => {
  try {
    await Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { user_id: req.user.id, is_read: false } },
    );

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (err) {
    console.error("Mark all read error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update notifications",
    });
  }
});

module.exports = router;
