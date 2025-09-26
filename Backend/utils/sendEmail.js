const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER, // generated ethereal user
      pass: process.env.EMAIL_PASS, // generated ethereal password
    },
  });

  const mailOptions = {
    from: '"Course Selling App" <no-reply@courseselling.com>',
    to: options.to,
    subject: options.subject,
    text: options.text,
    // html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
