const { sequelize, User } = require("./src/models/dbassociation");

async function seedUser() {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");

    await sequelize.sync({ alter: true });

    const email = "mary@gmail.com";
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      console.log(`User ${email} already exists.`);
      return;
    }

    await User.create({
      username: "mary_admin",
      email: email,
      passwordHash: "password123",
      role: "admin",
      isActive: true,
    });

    console.log(`User ${email} created successfully with password: password123`);
  } catch (error) {
    console.error("Unable to seed user:", error);
  } finally {
    await sequelize.close();
  }
}

seedUser();
