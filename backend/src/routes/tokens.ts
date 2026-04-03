import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma.js';
import { adminMiddleware } from '../middleware/auth.js';
import { randomBytes } from 'crypto';

export async function tokenRoutes(fastify: FastifyInstance) {
  fastify.get('/api/admin/tokens', { preHandler: adminMiddleware }, async (request, reply) => {
    const tokens = await prisma.registrationToken.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(tokens);
  });

  fastify.post('/api/admin/tokens', { preHandler: adminMiddleware }, async (request, reply) => {
    const token = randomBytes(16).toString('hex');

    const newToken = await prisma.registrationToken.create({
      data: { token },
    });

    return reply.send(newToken);
  });

  fastify.delete('/api/admin/tokens/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };

    await prisma.registrationToken.delete({
      where: { id },
    });

    return reply.send({ success: true });
  });
}
