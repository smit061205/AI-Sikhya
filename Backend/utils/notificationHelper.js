const { Notification } = require('../models/notification');

/**
 * Creates and saves a notification.
 * @param {object} details - The notification details.
 * @param {string} details.recipient - The ID of the recipient (User or Admin).
 * @param {string} details.recipientModel - The model of the recipient ('User' or 'Admin').
 * @param {string} details.type - The type of notification.
 * @param {string} details.title - The title of the notification.
 * @param {string} details.message - The main content of the notification.
 * @param {string} [details.sender] - The ID of the sender.
 * @param {string} [details.senderModel] - The model of the sender ('User' or 'Admin').
 * @param {string} [details.relatedCourse] - The ID of the related course.
 * @param {string} [details.relatedQuestion] - The ID of the related question.
 * @param {string} [details.actionUrl] - The URL for the notification action.
 * @param {string} [details.priority] - The priority of the notification ('low', 'medium', 'high').
 */
const createNotification = async (details) => {
  try {
    const notification = new Notification(details);
    await notification.save();
    // In a real-world app, you might also push this to a real-time service like Socket.io
    console.log(`Notification created for ${details.recipientModel} ${details.recipient}: ${details.title}`);
  } catch (error) {
    console.error('--- ERROR creating notification ---', error);
  }
};

module.exports = { createNotification };
