import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma.js';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/api/health', async (request, reply) => {
    const health: {
      status: string;
      timestamp: string;
      database: { status: string; latency?: number; error?: string };
      environment: { nodeEnv: string; port: number };
    } = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: { status: 'unknown' },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '3001', 10),
      },
    };

    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      health.database = {
        status: 'connected',
        latency: Date.now() - start,
      };
    } catch (error) {
      health.database = {
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      health.status = 'degraded';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    return reply.status(statusCode).send(health);
  });
}
