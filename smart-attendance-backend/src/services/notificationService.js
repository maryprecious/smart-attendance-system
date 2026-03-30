const { Notification, User } = require("../models/dbassociation");
const firebaseApp = require("../config/firebase");

class NotificationService {
  static async createNotification(
    userId,
    title,
    message,
    type = "INFO",
    data = null,
  ) {
    try {
      const notification = await Notification.create({
        user_id: userId,
        title,
        message,
        type,
        data,
        is_read: false,
      });
      return notification;
    } catch (err) {
      console.error("Failed to create notification:", err);
      return null;
    }
  }

  static async sendEmail(email, subject, body) {
    console.log(`
      [EMAIL SERVICE MOCK]
      TO: ${email}
      SUBJECT: ${subject}
      BODY: ${body}
    `);
    return true;
  }

  static async sendPushNotification(fcmToken, title, body, data = {}) {
    if (!firebaseApp) return false;

    try {
      const message = {
        notification: { title, body },
        data: {
          ...data,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        token: fcmToken,
      };

      await firebaseApp.messaging().send(message);
      return true;
    } catch (error) {
      console.error("Push notification failed:", error.message);
      return false;
    }
  }

  static async notifyUser(
    userId,
    title,
    message,
    type = "INFO",
    options = { sendEmail: false, sendPush: true }
  ) {
    const notification = await this.createNotification(
      userId,
      title,
      message,
      type,
    );

    const user = await User.findByPk(userId);
    if (!user) return notification;

    if (options.sendEmail && user.email) {
      await this.sendEmail(user.email, title, message);
    }

    if (options.sendPush && user.fcm_token) {
      await this.sendPushNotification(user.fcm_token, title, message, {
        notificationId: notification ? notification.id.toString() : "",
        type,
      });
    }

    return notification;
  }
}

module.exports = NotificationService;
