const prisma = require('../utils/db');

// Fetch ALL active jobs until they are fully completed
const getCallList = async (req, res) => {
    try {
        const jobs = await prisma.serviceRequest.findMany({
            where: {
                status: {
                    not: 'COMPLETED' // See all jobs until they are 100% done
                }
            },
            include: {
                client: { select: { name: true, phone: true, email: true } },
                inspector: { select: { name: true, phone: true } },
                // Because Workers apply via JobInterest, we fetch them through the relation
                interests: {
                    include: {
                        worker: { select: { name: true, phone: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(jobs);
    } catch (error) {
        console.error("Telecaller Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch call list." });
    }
};

// Add a note after calling the client/worker/inspector
const addCallNote = async (req, res) => {
    const { id } = req.params;
    const { note } = req.body;

    if (!note) return res.status(400).json({ error: "Note cannot be empty." });

    try {
        const job = await prisma.serviceRequest.findUnique({ where: { id } });
        
        // Append the new call note to existing admin notes so the Admin can see it too
        const updatedNote = job.adminNote 
            ? `${job.adminNote}\n📞 Telecaller: ${note}` 
            : `📞 Telecaller: ${note}`;

        await prisma.serviceRequest.update({
            where: { id },
            data: { adminNote: updatedNote }
        });

        res.status(200).json({ message: "Call log saved!" });
    } catch (error) {
        console.error("Call Note Error:", error);
        res.status(500).json({ error: "Failed to save call note." });
    }
};

module.exports = { getCallList, addCallNote };