

const nodemailer = require("nodemailer");

async function sendEmailWithAttachment(email ) {

  
    try {
      
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        service: "gmail",
        port: 465,
        secure: true,
        auth: {
          user: process.env.Email,
          pass: process.env.pass,
        },
      });
      console.log(email)
  
      const mailOptions = {
        from: `${process.env.Email} `,
        to: email,
        subject: `Account Activation`,
        text: `Hi Dear,\n Your account has been activated`,
      };
  
      // Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.response);
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }

  module.exports ={sendEmailWithAttachment} 