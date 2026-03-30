module.exports = (sequelize, DataTypes) => {
  const Report = sequelize.define(
    "Report",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      report_type: {
        type: DataTypes.ENUM(
          "daily",
          "weekly",
          "monthly",
          "semester",
          "custom",
        ),
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
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      generated_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      start_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      total_sessions: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_present: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_late: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_absent: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      attendance_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      summary_data: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      file_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("pending", "generated", "exported"),
        allowNull: false,
        defaultValue: "generated",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "reports",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: "idx_reports_department_id",
          fields: ["department_id"],
        },
        {
          name: "idx_reports_subject_id",
          fields: ["subject_id"],
        },
        {
          name: "idx_reports_user_id",
          fields: ["user_id"],
        },
        {
          name: "idx_reports_generated_by",
          fields: ["generated_by"],
        },
        {
          name: "idx_reports_date_range",
          fields: ["start_date", "end_date"],
        },
        {
          name: "idx_reports_type",
          fields: ["report_type"],
        },
      ],
    },
  );

  Report.associate = (models) => {
  };

  return Report;
};
