const jwt = require('jsonwebtoken');
const prisma = require('../utils/db');
const nodemailer = require('nodemailer');

// 1. SET UP BREVO MAILER (WITH POOLING FOR SPEED)
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    pool: true, // 🚀 NEW: Keeps the connection open so future emails send instantly
    maxConnections: 5,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// POST /api/auth/send-otp
const requestOtp = async (req, res) => {
    const { email } = req.body; 
    if (!email) return res.status(400).json({ error: "Email is required" });

    const cleanEmail = email.toLowerCase().trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
    const otpExpiry = new Date(Date.now() + 10 * 60000); 

    try {
        await prisma.user.upsert({
            where: { email: cleanEmail },
            update: { otp, otpExpiry },
            create: { email: cleanEmail, role: 'CLIENT', otp, otpExpiry }
        });

        const mailOptions = {
            from: `"Engineering Platform" <${process.env.BREVO_EMAIL}>`,
            to: cleanEmail,
            subject: "Your Platform Login Code",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-w: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 10px;">
                    <h2 style="color: #1f2937;">Welcome to the Platform!</h2>
                    <p style="color: #4b5563;">Your secure login code is:</p>
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #4F46E5; letter-spacing: 5px; margin: 0;">${otp}</h1>
                    </div>
                    <p style="color: #6b7280; font-size: 12px;">This code will expire in 10 minutes.</p>
                </div>
            `
        };

        // 🚀 FIRE AND FORGET 🚀
        // Notice there is NO "await" here! The email sends in the background.
        transporter.sendMail(mailOptions).catch(err => {
            console.error("Background Email Failed:", err);
        });
        
        console.log(`✅ Background email triggered for ${cleanEmail}`);
        
        // This triggers instantly, stopping the loading spinner immediately!
        res.status(200).json({ message: "OTP sent successfully to your email!" });

    } catch (error) {
        console.error("Auth Error:", error);
        res.status(500).json({ error: "Failed to process request." });
    }
};

// POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP required" });

    const cleanEmail = email.toLowerCase().trim();

    try {
        const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

        if (!user) return res.status(404).json({ error: "User not found." });

        const inputOtp = String(otp).trim();
        const dbOtp = String(user.otp).trim();

        if (inputOtp !== dbOtp) return res.status(400).json({ error: "Invalid OTP." });
        if (new Date() > new Date(user.otpExpiry)) return res.status(400).json({ error: "Expired OTP." });

        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET || 'fallback_secret', 
            { expiresIn: '1d' }
        );

        // 🚀 PUT 'AWAIT' BACK HERE! 🚀
        // Database calls are lightning fast (10ms), so we await them 
        // to ensure the connection safely closes and returns to the pool.
        await prisma.user.update({
            where: { email: cleanEmail },
            data: { otp: null, otpExpiry: null, isVerified: true }
        });

        // Let them into the dashboard!
        res.status(200).json({ message: "Login successful!", token, role: user.role });
        
    } catch (error) {
        console.error("[Auth API Error]:", error);
        res.status(500).json({ error: "Failed to verify OTP." });
    }
};
module.exports = { requestOtp, verifyOtp };