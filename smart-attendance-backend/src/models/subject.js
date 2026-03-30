module.exports = (sequelize, DataTypes) => {
  const Subject = sequelize.define(
    "Subject",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      department_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      instructor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      credits: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: true,
      },
      semester: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "subjects",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: "idx_subjects_code",
          fields: ["code"],
        },
        {
          name: "idx_subjects_department_id",
          fields: ["department_id"],
        },
        {
          name: "idx_subjects_instructor_id",
          fields: ["instructor_id"],
        },
      ],
    },
  );

  Subject.associate = (models) => {
    if (models.QRSession) {
      Subject.hasMany(models.QRSession, {
        foreignKey: "subject_id",
        as: "qrSessions",
      });
    }
  };

  return Subject;
};
