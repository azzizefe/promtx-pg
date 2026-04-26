import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma';
import { authenticate } from '../_lib/auth';
import { success, error } from '../_lib/errors';
import { rateLimit } from '../_lib/rateLimit';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json(error('Method not allowed'));

  try {
    const authUser = await authenticate(req);
    
    // Rate limiting: 100 likes per hour
    const rl = await rateLimit(`like:${authUser.userId}`, 100, 3600);
    if (!rl.success) {
      res.setHeader('Retry-After', rl.retryAfter.toString());
      return res.status(429).json(error('Çok fazla beğeni işlemi. Lütfen 1 saat sonra tekrar deneyin.'));
    }

    const { imageId } = req.body || {};
    if (!imageId) return res.status(400).json(error('Missing imageId'));

    // Check if image exists
    const image = await prisma.imageGeneration.findUnique({
      where: { id: imageId }
    });

    if (!image) return res.status(404).json(error('Görsel bulunamadı'));

    // Find existing like
    const existingLike = await prisma.imageLike.findUnique({
      where: {
        userId_imageGenerationId: {
          userId: authUser.userId,
          imageGenerationId: imageId,
        }
      }
    });

    if (existingLike) {
      // Unlike
      await prisma.$transaction([
        prisma.imageLike.delete({
          where: { id: existingLike.id }
        }),
        prisma.imageGeneration.update({
          where: { id: imageId },
          data: { likesCount: { decrement: 1 } }
        })
      ]);
      
      return res.status(200).json(success({ liked: false }));
    } else {
      // Like
      await prisma.$transaction([
        prisma.imageLike.create({
          data: {
            userId: authUser.userId,
            imageGenerationId: imageId,
          }
        }),
        prisma.imageGeneration.update({
          where: { id: imageId },
          data: { likesCount: { increment: 1 } }
        })
      ]);

      return res.status(200).json(success({ liked: true }));
    }
  } catch (err: any) {
    if (err.statusCode === 401) return res.status(401).json(error(err.message));
    console.error('Like API error:', err);
    return res.status(500).json(error('Sunucu hatası'));
  }
}
