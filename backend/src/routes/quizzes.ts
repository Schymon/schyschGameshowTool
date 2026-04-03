import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { z } from 'zod';

const quizSchema = z.object({
  type: z.enum(['buzzer', 'matrix']),
  title: z.string().min(1),
  data: z.any(),
});

export async function quizRoutes(fastify: FastifyInstance) {
  fastify.get('/api/quizzes', { preHandler: authMiddleware }, async (request, reply) => {
    const quizzes = await prisma.quiz.findMany({
      include: {
        creator: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(quizzes);
  });

  fastify.post('/api/quizzes', { preHandler: authMiddleware }, async (request, reply) => {
    const body = request.body as z.infer<typeof quizSchema>;
    const validation = quizSchema.safeParse(body);

    if (!validation.success) {
      return reply.status(400).send({ error: validation.error.message });
    }

    const quiz = await prisma.quiz.create({
      data: {
        type: body.type,
        title: body.title,
        data: body.data,
        creatorId: request.user!.id,
      },
    });

    return reply.send(quiz);
  });

  fastify.get('/api/quizzes/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, username: true },
        },
      },
    });

    if (!quiz) {
      return reply.status(404).send({ error: 'Quiz not found' });
    }

    return reply.send(quiz);
  });

  fastify.delete('/api/quizzes/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const quiz = await prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      return reply.status(404).send({ error: 'Quiz not found' });
    }

    if (quiz.creatorId !== request.user!.id && request.user!.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    await prisma.quiz.delete({
      where: { id },
    });

    return reply.send({ success: true });
  });
}
