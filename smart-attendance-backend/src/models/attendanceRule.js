module.exports = (sequelize, DataTypes) => {
  const AttendanceRule = sequelize.define(
    "AttendanceRule",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      department_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      subject_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      grace_period_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 15,
      },
      late_threshold_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 15,
      },
      minimum_attendance_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 75.0,
      },
      mark_absent_after_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 60,
      },
      allow_proxy_marking: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      require_location_verification: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      location_radius_meters: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 100,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "attendance_rules",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: "idx_attendance_rules_department_id",
          fields: ["department_id"],
        },
        {
          name: "idx_attendance_rules_subject_id",
          fields: ["subject_id"],
        },
      ],
    },
  );

  AttendanceRule.associate = (models) => {
  };

  return AttendanceRule;
};
