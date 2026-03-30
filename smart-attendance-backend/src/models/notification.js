module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "Notification",
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
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      read_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      data: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: "notifications",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: "idx_notifications_user_id",
          fields: ["user_id"],
        },
        {
          name: "idx_notifications_is_read",
          fields: ["is_read"],
        },
        {
          name: "idx_notifications_created_at",
          fields: ["created_at"],
        },
      ],
    },
  );

  Notification.associate = (models) => {
    if (models.User) {
      Notification.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    }
  };

  return Notification;
};
