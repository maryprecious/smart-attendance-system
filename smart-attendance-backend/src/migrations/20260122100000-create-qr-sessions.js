'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('qr_sessions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      session_type: {
        type: Sequelize.ENUM('daily', 'department', 'event'),
        defaultValue: 'daily',
        allowNull: false
      },
      department: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      event_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      subject_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      qr_code: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      valid_from: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
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

    try {
      await queryInterface.addIndex('qr_sessions', ['created_by'], { name: 'idx_qr_sessions_created_by' });
    } catch (e) { }

    try {
      await queryInterface.addIndex('qr_sessions', ['is_active'], { name: 'idx_qr_sessions_is_active' });
    } catch (e) { }

    try {
      await queryInterface.addIndex('qr_sessions', ['session_type'], { name: 'idx_qr_sessions_session_type' });
    } catch (e) { }
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('qr_sessions');
  }
};
