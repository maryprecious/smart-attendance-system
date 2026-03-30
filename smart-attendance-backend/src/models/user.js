const argon2 = require("argon2");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          len: {
            args: [3, 50],
            msg: "Username must be between 3 and 50 characters",
          },
        },
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: {
            msg: "Must be a valid email address",
          },
        },
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "password_hash",
      },
      role: {
        type: DataTypes.ENUM("admin", "staff", "member"),
        allowNull: false,
        defaultValue: "member",
        validate: {
          isIn: {
            args: [["admin", "staff", "member"]],
            msg: "Role must be admin, staff, or member",
          },
        },
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      department_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "departments",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "last_login",
      },
      profilePhoto: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "profile_photo",
      },
      fcmToken: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "fcm_token",
      },
    },
    {
      tableName: "users",
      timestamps: true,
      underscored: true,
      paranoid: false,
      indexes: [
        { unique: true, fields: ["email"] },
        { unique: true, fields: ["username"] },
        { fields: ["role"] },
        { fields: ["department"] },
        { fields: ["is_active"] },
      ],
      hooks: {
        beforeCreate: async (user) => {
          if (user.passwordHash) {
            user.passwordHash = await argon2.hash(user.passwordHash);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed("passwordHash")) {
            user.passwordHash = await argon2.hash(user.passwordHash);
          }
        },
      },
    },
  );

  User.associate = (models) => {
    User.hasMany(models.Session, {
      foreignKey: "user_id",
      as: "sessions",
      onDelete: "CASCADE",
    });

    User.hasMany(models.QRSession, {
      foreignKey: "created_by",
      as: "createdQRSessions",
    });

    User.hasMany(models.AttendanceLog, {
      foreignKey: "user_id",
      as: "attendanceLogs",
    });

    User.hasMany(models.AuditLog, {
      foreignKey: "performed_by",
      as: "auditLogs",
    });

    User.hasMany(models.Notification, {
      foreignKey: "user_id",
      as: "notifications",
      onDelete: "CASCADE",
    });

    if (models.Subject) {
      User.belongsToMany(models.Subject, {
        through: "UserSubjects",
        foreignKey: "user_id",
        otherKey: "subject_id",
        as: "enrolledSubjects",
      });
    }

    if (models.Department) {
      User.belongsTo(models.Department, {
        foreignKey: "department_id",
        as: "userDepartment",
      });
    }
  };

  return User;
};