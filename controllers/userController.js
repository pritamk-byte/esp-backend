const prisma = require('../utils/db');

const getMyProfile = async (req, res) => {
    console.log(`\n🔍 [API] Fetching profile for User ID:`, req.user?.id);
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, phone: true, role: true, isVerified: true }
        });

        if (!user) {
            console.log(`❌ [API] Error: User ID ${req.user.id} not found in database!`);
            return res.status(404).json({ error: "User not found in database." });
        }

        console.log(`✅ [API] Profile found for: ${user.email}`);
        res.status(200).json(user);
    } catch (error) {
        console.error("❌ [API] CRASH in getMyProfile:", error);
        res.status(500).json({ error: "Failed to fetch profile. Check terminal logs." });
    }
};

const completeOnboarding = async (req, res) => {
    const { name, phone } = req.body;
    
    console.log(`\n📝 [API] Attempting to save profile for User ID:`, req.user?.id);
    console.log(`➡️  Data received - Name: "${name}", Phone: "${phone}"`);

    if (!name || !phone) return res.status(400).json({ error: "Name and phone are required." });

    try {
        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { name, phone }
        });
        
        console.log(`✅ [API] Profile saved successfully for ${updatedUser.email}!`);
        res.status(200).json({ message: "Profile updated successfully!", user: updatedUser });
        
    } catch (error) {
        console.error("❌ [API] CRASH in completeOnboarding:", error);
        
        // Check if the phone number already belongs to someone else
        if (error.code === 'P2002') {
            console.log("⚠️ [API] Error: Phone number already exists in DB.");
            return res.status(400).json({ error: "This phone number is already registered." });
        }
        
        res.status(500).json({ error: "Failed to update profile." });
    }
};

module.exports = { getMyProfile, completeOnboarding };