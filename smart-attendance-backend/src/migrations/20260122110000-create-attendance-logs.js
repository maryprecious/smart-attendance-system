'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.dropTable('attendance_logs');
    await queryInterface.createTable('attendance_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      qr_session_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'qr_sessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      timestamp: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      status: {
        type: Sequelize.ENUM('present', 'absent', 'late', 'excused'),
        defaultValue: 'present',
        allowNull: false
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      device_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      location_lat: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      location_long: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      },
      verification_method: {
        type: Sequelize.STRING(50),
        defaultValue: 'qr_scan'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('attendance_logs', ['user_id'], { name: 'idx_attendance_logs_user_id' });
    await queryInterface.addIndex('attendance_logs', ['qr_session_id'], { name: 'idx_attendance_logs_qr_session_id' });
    await queryInterface.addIndex('attendance_logs', ['timestamp'], { name: 'idx_attendance_logs_timestamp' });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('attendance_logs');
  }
};
