import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma';
import { success, error } from '../_lib/errors';
import { rateLimit } from '../_lib/rateLimit';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json(error('Method not allowed'));

  try {
    // Rate limiting
    const ip = (req.headers['x-forwarded-for'] as string) || 'unknown';
    const rl = await rateLimit(`gallery-public:${ip}`, 100, 60);
    
    if (!rl.success) {
      res.setHeader('Retry-After', rl.retryAfter.toString());
      return res.status(429).json(error('Çok fazla istek. Lütfen 1 dakika sonra tekrar deneyin.'));
    }

    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 24, 100);
    const model = req.query.model as string | undefined;
    const studio = req.query.studio as string | undefined;
    const search = req.query.search as string | undefined;
    const sort = (req.query.sort as string) || 'newest';
    const includeNsfw = req.query.nsfw === 'true';

    // Basic constraints
    const where: any = { 
      isPublic: true, 
      status: 'completed',
      isNsfw: includeNsfw ? undefined : false 
    };

    if (model) where.modelId = model;
    if (search) where.prompt = { contains: search, mode: 'insensitive' };
    if (cursor) {
      if (sort === 'newest') where.createdAt = { lt: new Date(cursor) };
      // For complex sorts, simple date cursors are harder, keeping basic for stability
    }

    // Fetch logic based on sort
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'popular') {
      orderBy = { likesCount: 'desc' };
    } else if (sort === 'trend') {
      // Trend: created within last 7 days sorted by likes
      where.createdAt = {
        ...where.createdAt,
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      };
      orderBy = { likesCount: 'desc' };
    }

    // Random sort fallback
    if (sort === 'random') {
      const totalCount = await prisma.imageGeneration.count({ where });
      const skip = Math.max(0, Math.floor(Math.random() * Math.max(1, totalCount - limit)));
      
      const items = await prisma.imageGeneration.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          prompt: true,
          resultUrl: true,
          thumbnailUrl: true,
          modelId: true,
          provider: true,
          width: true,
          height: true,
          aspectRatio: true,
          likesCount: true,
          createdAt: true,
          user: { select: { displayName: true, avatarUrl: true } },
        },
      });

      return res.status(200).json(success({
        items,
        nextCursor: null,
      }));
    }

    const items = await prisma.imageGeneration.findMany({
      where,
      orderBy,
      take: limit + 1,
      select: {
        id: true,
        prompt: true,
        resultUrl: true,
        thumbnailUrl: true,
        modelId: true,
        provider: true,
        width: true,
        height: true,
        aspectRatio: true,
        likesCount: true,
        createdAt: true,
        user: { select: { displayName: true, avatarUrl: true } },
      },
    });

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    return res.status(200).json(success({
      items,
      nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
    }));
  } catch (err: any) {
    console.error('Gallery public error:', err);
    return res.status(500).json(error('Sunucu hatası'));
  }
}
