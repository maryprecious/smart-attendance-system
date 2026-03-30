require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const compression = require("compression");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const logger = require('./utils/logger');

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use(helmet());
app.use(morgan("dev"));

app.use(
  rateLimit({
    max: 100,
    message: { success: false, message: "Too many requests – try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

const originsEnv = process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:5173,http://localhost:4200";
const allowedOrigins = originsEnv.split(",").map(o => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(cookieParser());
app.use(compression());
app.set("trust proxy", 1);

const { sequelize } = require("./models/dbassociation");
const { QRSession, User, AttendanceLog } = require("./models/dbassociation");

sequelize.sync({ alter: true }).then(() => {
  logger.info("Database & tables updated!");
});

app.get("/", (req, res) => {
  res.json({
    service: "smart-attendance-backend",
    status: "running",
    environment: process.env.NODE_ENV || "development",
    time: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    serverTime: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV !== "production") {
  app.post("/data", (req, res) => {
    logger.debug(req.body);
    res.send("Data received");
  });

  app.get("/set-cookie", (req, res) => {
    res.cookie("token", "abc123", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60,
    });
    res.send("Cookie has been set!");
  });

  app.get("/get-cookie", (req, res) => {
    const token = req.cookies?.token;
    res.send(`Your cookie value: ${token}`);
  });
}

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userroutes");
const qrsessionRoutes = require("./routes/qrsessionRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/qr", qrsessionRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/analytics", analyticsRoutes);
app.use('/admin', adminRoutes);
app.use('/notifications', notificationRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  logger.error(`Server error: ${err.message}`, { stack: err.stack });

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS policy violation",
    });
  }

  res.status(500).json({
    success: false,
    message: "Something went wrong on the server",
  });
});

app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});
