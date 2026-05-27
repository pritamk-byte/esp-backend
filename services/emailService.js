const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendOTP = async (toEmail, otpCode) => {
    try {
        await transporter.sendMail({
            from: '"Engineering Platform" <no-reply@yourdomain.com>', // You can change this name
            to: toEmail,
            subject: "Your Secure Login OTP",
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Welcome back!</h2>
                    <p>Your secure one-time password (OTP) is:</p>
                    <h1 style="color: #2563eb; letter-spacing: 5px;">${otpCode}</h1>
                    <p>This code will expire in 10 minutes.</p>
                </div>
            `
        });
        return true;
    } catch (error) {
        console.error("Nodemailer Error:", error);
        return false;
    }
};

module.exports = { sendOTP };