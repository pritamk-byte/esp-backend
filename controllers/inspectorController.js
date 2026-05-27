const prisma = require('../utils/db');

// Get all requests assigned to this specific inspector
const getAssignedInspections = async (req, res) => {
    try {
        const inspections = await prisma.serviceRequest.findMany({
            where: { inspectorId: req.user.id },
            include: { 
                client: { select: { email: true, phone: true } } 
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(inspections);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch assigned inspections." });
    }
};

// Submit the inspection report and mark it DONE
const submitInspectionReport = async (req, res) => {
    const { id } = req.params;
    const { inspectionNotes } = req.body;

    try {
        // 1. First, check if the job exists and belongs to this inspector
        const existingJob = await prisma.serviceRequest.findUnique({ where: { id } });
        
        if (!existingJob || existingJob.inspectorId !== req.user.id) {
            return res.status(403).json({ error: "Unauthorized: You can only update your own assigned inspections." });
        }

        // 2. Safely update the job
        const request = await prisma.serviceRequest.update({
            where: { id: id },
            data: { 
                inspectionNotes, 
                inspectionDate: new Date(),
                status: 'INSPECTION_DONE' 
            }
        });
        res.status(200).json({ message: "Inspection report submitted successfully!", request });
    } catch (error) {
        console.error("Inspection Update Error:", error);
        res.status(500).json({ error: "Failed to submit report." });
    }
};
module.exports = { getAssignedInspections, submitInspectionReport };