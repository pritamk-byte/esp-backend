const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // ⚠️ Change this to the exact email address you use to log in via OTP
    const targetEmail = "im.pritamk@gmail.com"; 

    try {
        const updatedUser = await prisma.user.update({
            where: { email: targetEmail },
            data: { role: 'SUPER_ADMIN' }
        });

        console.log(`✅ Success! ${updatedUser.email} has been promoted to SUPER_ADMIN.`);
    } catch (error) {
        if (error.code === 'P2025') {
            console.error("❌ Error: No user found with that email. Have you logged in at least once?");
        } else {
            console.error("❌ Unexpected Error:", error);
        }
    }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });