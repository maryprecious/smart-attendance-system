module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      admin_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      action: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      entity_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      old_values: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      new_values: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      changes_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      attendance_log_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "attendance_logs",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
    },
    {
      tableName: "audit_logs",
      timestamps: true,
      underscored: true,
      indexes: [
        { name: "idx_audit_logs_admin_id", fields: ["admin_id"] },
        { name: "idx_audit_logs_entity", fields: ["entity_type", "entity_id"] },
        { name: "idx_audit_logs_created_at", fields: ["created_at"] },
        { name: "idx_audit_logs_attendance_log_id", fields: ["attendance_log_id"] },
      ],
    }
  );

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, {
      foreignKey: "admin_id",
      as: "admin",
    });

    AuditLog.belongsTo(models.AttendanceLog, {
      foreignKey: "attendance_log_id",
      as: "attendanceLog",
    });
  };

  return AuditLog;
};