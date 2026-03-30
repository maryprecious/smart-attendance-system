module.exports = (sequelize, DataTypes) => {
  const AttendanceLog = sequelize.define(
    "AttendanceLog",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "user_id",
      },
      qr_session_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "qr_session_id",
      },
      scan_time: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "scan_time",
      },
      status: {
        type: DataTypes.ENUM("present", "late", "absent"),
        allowNull: false,
        defaultValue: "present",
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
        field: "ip_address",
      },
      device_info: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "device_info",
      },
      is_valid: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_valid",
      },
      flagged_reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "flagged_reason",
      },
    },
    {
      tableName: "attendance_logs",
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ["user_id"] },
        { fields: ["qr_session_id"] },
        { fields: ["scan_time"] },
        { fields: ["status"] },
        { fields: ["is_valid"] },
        { fields: ["user_id", "qr_session_id"] },
      ],
    },
  );

  AttendanceLog.associate = (models) => {
    AttendanceLog.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });

    AttendanceLog.belongsTo(models.QRSession, {
      foreignKey: "qr_session_id",
      as: "qrSession",
    });

    AttendanceLog.hasMany(models.AuditLog, {
      foreignKey: "attendance_log_id",
      as: "auditLogs",
    });
  };

  return AttendanceLog;
};
