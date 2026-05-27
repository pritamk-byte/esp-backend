const { PrismaClient } = require('@prisma/client');

// This pattern stops Node from opening 50 connections by accident
const globalForPrisma = global;
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

module.exports = prisma;