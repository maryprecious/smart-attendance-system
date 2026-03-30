const express = require("express");
const router = express.Router();
const { z } = require("zod");
const argon2 = require("argon2");
const { Op } = require("sequelize");
const { User, AuditLog } = require("../models/dbassociation");
const {
  authenticateToken,
  authorizeRole,
  checkOwnership,
} = require("../middlewares/auth");

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "staff", "member"]),
  department: z.string().optional(),
});

const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  department: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8),
});

const bulkUploadSchema = z.array(
  z.object({
    username: z.string().min(3).max(50),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(["admin", "staff", "member"]).optional().default("member"),
    department: z.string().optional(),
  })
);

router.post(
  "/",
  authenticateToken,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const data = createUserSchema.parse(req.body);

      const existing = await User.findOne({
        where: { [Op.or]: [{ email: data.email }, { username: data.username }] },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Email or username already exists",
          code: "DUPLICATE_USER",
        });
      }

      const passwordHash = await argon2.hash(data.password);

      const user = await User.create({
        username: data.username,
        email: data.email,
        passwordHash,
        role: data.role,
        department: data.department || null,
      });

      await AuditLog.create({
        performed_by: req.user.id,
        action: "CREATE_USER",
        entity_type: "User",
        entity_id: user.id,
        reason: "Admin created new user account",
        new_values: user.toJSON(),
        changes_description: `Created user ${user.username} (${user.email}) with role ${user.role}`,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
      });

      res.status(201).json({
        success: true,
        message: "User created successfully",
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
      console.error("Create user error:", err);
      if (err.name === "ZodError") {
        return res.status(400).json({
          success: false,
          message: err.errors[0].message,
          code: "VALIDATION_ERROR",
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to create user",
        code: "USER_CREATE_FAILED",
      });
    }
  }
);

router.get(
  "/",
  authenticateToken,
  authorizeRole(["admin", "staff"]),
  async (req, res) => {
    try {
      const { role, department, isActive, page = 1, limit = 10 } = req.query;

      const whereClause = {};
      if (role) whereClause.role = role;
      if (department) whereClause.department = department;
      if (isActive !== undefined) whereClause.isActive = isActive === "true";

      const offset = (page - 1) * limit;

      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        attributes: [
          "id",
          "username",
          "email",
          "role",
          "department",
          "isActive",
          "createdAt",
          "lastLogin",
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
        users,
      });
    } catch (err) {
      console.error("Get users error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch users",
        code: "USERS_FETCH_FAILED",
      });
    }
  }
);

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (req.user.role === "student" && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own profile",
        code: "FORBIDDEN",
      });
    }

    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "username",
        "email",
        "role",
        "department",
        "isActive",
        "profilePhoto",
        "createdAt",
        "updatedAt",
        "lastLogin",
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      code: "USER_FETCH_FAILED",
    });
  }
});

router.put("/:id", authenticateToken, checkOwnership, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const data = updateUserSchema.parse(req.body);

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    if (data.username || data.email) {
      const whereClause = { id: { [Op.ne]: userId } };
      const orConditions = [];
      if (data.username && data.username !== user.username) orConditions.push({ username: data.username });
      if (data.email && data.email !== user.email) orConditions.push({ email: data.email });

      if (orConditions.length > 0) {
        whereClause[Op.or] = orConditions;
        const existing = await User.findOne({ where: whereClause });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: "Username or email already taken",
            code: "DUPLICATE_USER",
          });
        }
      }
    }

    if (data.username) user.username = data.username;
    if (data.email) user.email = data.email;
    if (data.department) user.department = data.department;

    await user.save();

    if (req.user.role === "admin" && req.user.id !== userId) {
      await AuditLog.create({
        performed_by: req.user.id,
        action: "UPDATE_USER",
        entity_type: "User",
        entity_id: user.id,
        reason: "Admin updated user profile",
        old_values: { },
        new_values: user.toJSON(),
        changes_description: `Updated fields for user ${user.username}`,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
      });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (err) {
    console.error("Update user error:", err);
    if (err.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: err.errors[0].message,
        code: "VALIDATION_ERROR",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      code: "USER_UPDATE_FAILED",
    });
  }
});

router.patch(
  "/:id/role",
  authenticateToken,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;

      if (!["admin", "staff", "member"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role. Must be admin, staff, or member",
          code: "INVALID_ROLE",
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      if (userId === req.user.id && role !== "admin") {
        return res.status(400).json({
          success: false,
          message: "You cannot change your own admin role",
          code: "SELF_ROLE_CHANGE_FORBIDDEN",
        });
      }

      const oldRole = user.role;
      user.role = role;
      await user.save();

      await AuditLog.create({
        performed_by: req.user.id,
        action: "CHANGE_USER_ROLE",
        entity_type: "User",
        entity_id: user.id,
        reason: `Changed role from ${oldRole} to ${role}`,
        old_values: { role: oldRole },
        new_values: { role },
        changes_description: `Role changed from ${oldRole} to ${role}`,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
      });

      res.json({
        success: true,
        message: `User role changed to ${role}`,
        user: { id: user.id, username: user.username, role: user.role },
      });
    } catch (err) {
      console.error("Change role error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to change user role",
        code: "ROLE_CHANGE_FAILED",
      });
    }
  }
);

router.patch(
  "/:id/status",
  authenticateToken,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false",
          code: "INVALID_INPUT",
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      if (userId === req.user.id && !isActive) {
        return res.status(400).json({
          success: false,
          message: "You cannot deactivate your own account",
          code: "SELF_DEACTIVATION_FORBIDDEN",
        });
      }

      const oldStatus = user.isActive;
      user.isActive = isActive;
      await user.save();

      await AuditLog.create({
        performed_by: req.user.id,
        action: "CHANGE_USER_STATUS",
        entity_type: "User",
        entity_id: user.id,
        reason: `Changed account status from ${oldStatus ? "active" : "inactive"} to ${isActive ? "active" : "inactive"}`,
        old_values: { isActive: oldStatus },
        new_values: { isActive },
        changes_description: `User account ${isActive ? "activated" : "deactivated"}`,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
      });

      res.json({
        success: true,
        message: `User ${isActive ? "activated" : "deactivated"} successfully`,
        user: { id: user.id, username: user.username, isActive: user.isActive },
      });
    } catch (err) {
      console.error("Change status error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to change user status",
        code: "STATUS_CHANGE_FAILED",
      });
    }
  }
);

router.delete(
  "/:id",
  authenticateToken,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (userId === req.user.id) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete your own account",
          code: "SELF_DELETION_FORBIDDEN",
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      await AuditLog.create({
        performed_by: req.user.id,
        action: "DELETE_USER",
        entity_type: "User",
        entity_id: user.id,
        reason: "Admin deleted user account",
        old_values: user.toJSON(),
        changes_description: `Deleted user ${user.username} (${user.email})`,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
      });

      await user.destroy();

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (err) {
      console.error("Delete user error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to delete user",
        code: "USER_DELETE_FAILED",
      });
    }
  }
);

router.post(
  "/:id/change-password",
  authenticateToken,
  checkOwnership,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const data = changePasswordSchema.parse(req.body);

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      const isValid = await argon2.verify(user.passwordHash, data.currentPassword);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect",
          code: "INVALID_PASSWORD",
        });
      }

      const newPasswordHash = await argon2.hash(data.newPassword);
      user.passwordHash = newPasswordHash;
      await user.save();

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (err) {
      console.error("Change password error:", err);
      if (err.name === "ZodError") {
        return res.status(400).json({
          success: false,
          message: err.errors[0].message,
          code: "VALIDATION_ERROR",
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to change password",
        code: "PASSWORD_CHANGE_FAILED",
      });
    }
  }
);

router.post(
  "/bulk/upload",
  authenticateToken,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const users = bulkUploadSchema.parse(req.body);

      if (users.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No users provided",
          code: "EMPTY_BULK_DATA",
        });
      }

      const usernames = new Set();
      const emails = new Set();

      for (const u of users) {
        if (usernames.has(u.username) || emails.has(u.email)) {
          return res.status(400).json({
            success: false,
            message: `Duplicate username or email in request: ${u.username} / ${u.email}`,
            code: "DUPLICATE_IN_REQUEST",
          });
        }
        usernames.add(u.username);
        emails.add(u.email);
      }

      const existingUsers = await User.findAll({
        where: {
          [Op.or]: [
            { username: { [Op.in]: Array.from(usernames) } },
            { email: { [Op.in]: Array.from(emails) } },
          ],
        },
      });

      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Some usernames or emails already exist",
          conflicts: existingUsers.map((u) => ({
            username: u.username,
            email: u.email,
          })),
          code: "DUPLICATE_IN_DB",
        });
      }

      const createdUsers = [];
      const errors = [];

      for (let i = 0; i < users.length; i++) {
        try {
          const passwordHash = await argon2.hash(users[i].password);
          const newUser = await User.create({
            username: users[i].username,
            email: users[i].email,
            passwordHash,
            role: users[i].role || "member",
            department: users[i].department || null,
            isActive: true,
          });

          createdUsers.push({
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
          });
        } catch (err) {
          errors.push({
            index: i,
            username: users[i].username,
            error: err.message,
          });
        }
      }

      res.status(201).json({
        success: errors.length === 0,
        message: `Created ${createdUsers.length}/${users.length} users`,
        created: createdUsers,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err) {
      console.error("Bulk upload error:", err);
      if (err.name === "ZodError") {
        return res.status(400).json({
          success: false,
          message: "Invalid bulk upload format",
          errors: err.errors,
          code: "VALIDATION_ERROR",
        });
      }
      res.status(500).json({
        success: false,
        message: "Bulk upload failed",
        code: "BULK_UPLOAD_FAILED",
      });
    }
  }
);

router.get("/me/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        "id",
        "username",
        "email",
        "role",
        "department",
        "isActive",
        "profilePhoto",
        "createdAt",
        "updatedAt",
        "lastLogin",
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      code: "PROFILE_FETCH_FAILED",
    });
  }
});

router.get(
  "/export/csv",
  authenticateToken,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const { role, department } = req.query;

      const whereClause = {};
      if (role) whereClause.role = role;
      if (department) whereClause.department = department;

      const users = await User.findAll({
        where: whereClause,
        attributes: [
          "id",
          "username",
          "email",
          "role",
          "department",
          "isActive",
          "createdAt",
        ],
        order: [["createdAt", "DESC"]],
      });

      const headers = ["ID", "Username", "Email", "Role", "Department", "Active", "Created"];
      const rows = users.map((u) => [
        u.id,
        u.username,
        u.email,
        u.role,
        u.department || "",
        u.isActive ? "Yes" : "No",
        u.createdAt.toISOString(),
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) => {
              const escaped = String(cell).replace(/"/g, '""');
              return escaped.includes(",") ? `"${escaped}"` : escaped;
            })
            .join(",")
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=users.csv");
      res.send(csv);
    } catch (err) {
      console.error("Export users error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to export users",
        code: "EXPORT_FAILED",
      });
    }
  }
);

module.exports = router;