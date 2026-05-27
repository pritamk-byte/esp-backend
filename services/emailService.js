// Remove nodemailer entirely and use native fetch to bypass Render's SMTP block

const sendOtpEmail = async (userEmail, otp) => {
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
          email: "YOUR_VERIFIED_BREVO_EMAIL@gmail.com", // 🚨 Replace with your actual Brevo email
          name: "Engineering Platform" 
        },
        to: [{ email: userEmail }],
        subject: "Your Login Access Code",
        htmlContent: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Your Login Code</h2>
            <p>Your one-time password is: <strong style="font-size: 24px;">${otp}</strong></p>
            <p>This code will expire in 10 minutes.</p>
          </div>
        `
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Brevo API Error:", errorData);
      throw new Error("Failed to send email via API");
    }

    console.log(`✅ Email sent successfully to ${userEmail} via Brevo API`);
    return true;

  } catch (error) {
    console.error("Email Service Error:", error);
    throw error;
  }
};

module.exports = { sendOtpEmail };