const jwt = require('jsonwebtoken');
const prisma = require('../utils/db');
// 🚀 Nodemailer has been completely removed!

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

        // 🚀 NEW: Using the Brevo API directly to bypass Render's SMTP block
        const sendEmailViaAPI = async () => {
            try {
                const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'api-key': process.env.BREVO_API_KEY,
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        sender: { 
                            // 🚨 Ensure process.env.BREVO_EMAIL exactly matches your verified Brevo address
                            email: process.env.BREVO_EMAIL || "pritamkumarpoddar2002@gmail.com", 
                            name: "Engineering Platform" 
                        },
                        to: [{ email: cleanEmail }],
                        subject: "Your Platform Login Code",
                        htmlContent: `
                            <div style="font-family: Arial, sans-serif; padding: 20px; max-w: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 10px;">
                                <h2 style="color: #1f2937;">Welcome to the Platform!</h2>
                                <p style="color: #4b5563;">Your secure login code is:</p>
                                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                                    <h1 style="color: #4F46E5; letter-spacing: 5px; margin: 0;">${otp}</h1>
                                </div>
                                <p style="color: #6b7280; font-size: 12px;">This code will expire in 10 minutes.</p>
                            </div>
                        `
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Brevo API Error:", errorData);
                } else {
                    console.log(`✅ Background email triggered for ${cleanEmail} via API`);
                }
            } catch (err) {
                console.error("Background Email Failed:", err);
            }
        };

        // 🚀 FIRE AND FORGET 🚀
        // Triggers the API call in the background without making the user wait
        sendEmailViaAPI();
        
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

        await prisma.user.update({
            where: { email: cleanEmail },
            data: { otp: null, otpExpiry: null, isVerified: true }
        });

        res.status(200).json({ message: "Login successful!", token, role: user.role });
        
    } catch (error) {
        console.error("[Auth API Error]:", error);
        res.status(500).json({ error: "Failed to verify OTP." });
    }
};

module.exports = { requestOtp, verifyOtp };