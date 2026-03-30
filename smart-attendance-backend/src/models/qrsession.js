module.exports = (sequelize, DataTypes) => {
  const QRSession = sequelize.define(
    "QRSession",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      session_type: {
        type: DataTypes.ENUM("daily", "department", "event"),
        allowNull: false,
        defaultValue: "daily",
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      event_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      subject_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "subjects",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      qr_code: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      valid_from: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "qr_sessions",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: "idx_qr_sessions_created_by",
          fields: ["created_by"],
        },
        {
          name: "idx_qr_sessions_is_active",
          fields: ["is_active"],
        },
        {
          name: "idx_qr_sessions_session_type",
          fields: ["session_type"],
        },
      ],
    },
  );

  QRSession.associate = (models) => {
    if (models.User) {
      QRSession.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
    }

    if (models.Subject) {
      QRSession.belongsTo(models.Subject, {
        foreignKey: "subject_id",
        as: "subject",
      });
    }

    if (models.AttendanceLog) {
      QRSession.hasMany(models.AttendanceLog, {
        foreignKey: "qr_session_id",
        as: "attendanceLogs",
      });
    }
  };

  return QRSession;
};
