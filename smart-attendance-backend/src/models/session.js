module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define(
    "Session",
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
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      session_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false,
      },
      token_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      device_info: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      last_activity: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "sessions",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: "idx_sessions_user_id",
          fields: ["user_id"],
        },
        {
          name: "idx_sessions_session_id",
          unique: true,
          fields: ["session_id"],
        },
        {
          name: "idx_sessions_token_hash",
          fields: ["token_hash"],
        },
        {
          name: "idx_sessions_expires_at",
          fields: ["expires_at"],
        },
      ],
    },
  );

  Session.associate = (models) => {
    if (models.User) {
      Session.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
        onDelete: "CASCADE",
      });
    }
  };

  return Session;
};
