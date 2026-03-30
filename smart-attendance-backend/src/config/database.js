require('dotenv').config();

const { Sequelize } = require('sequelize');

const config = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

const sequelize = new Sequelize(config);

sequelize.authenticate()
  .then(() => {
    console.log('PostgreSQL connection is succesful');
  })
  .catch(err => {
    console.error('Unable to connect to PostgreSQL:', err.message);
    console.error('Used config:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER
    });
  });

module.exports = {
  ...config,       
  sequelize,       
  Sequelize      
};
