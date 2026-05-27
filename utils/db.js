const { PrismaClient } = require('@prisma/client');

// Simple, direct instantiation for Node.js backend
const prisma = new PrismaClient();

module.exports = prisma;