import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma';
import { authenticate } from '../_lib/auth';
import { success, error } from '../_lib/errors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json(error('Method not allowed'));

  try {
    // Authenticate user
    const authUser = await authenticate(req);
    
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 24, 100);
    
    // Filters
    const studio = req.query.studio as string | undefined;
    const model = req.query.model as string | undefined;
    const search = req.query.search as string | undefined;
    const isFavorite = req.query.isFavorite === 'true';

    // Construct filters for Image Generations
    const imgWhere: any = { userId: authUser.userId, status: 'completed' };
    if (model) imgWhere.modelId = model;
    if (search) imgWhere.prompt = { contains: search, mode: 'insensitive' };
    if (cursor) imgWhere.createdAt = { lt: new Date(cursor) };

    // Fetch Image Generations
    const images = await prisma.imageGeneration.findMany({
      where: imgWhere,
      orderBy: { createdAt: 'desc' },
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
      }
    });

    // Construct filters for Prompt History
    const promptWhere: any = { userId: authUser.userId };
    if (studio) promptWhere.studioType = studio;
    if (model) promptWhere.modelId = model;
    if (isFavorite) promptWhere.isFavorite = true;
    if (search) promptWhere.promptText = { contains: search, mode: 'insensitive' };
    if (cursor) promptWhere.createdAt = { lt: new Date(cursor) };

    // Fetch Prompt Histories
    const prompts = await prisma.promptHistory.findMany({
      where: promptWhere,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      select: {
        id: true,
        promptText: true,
        generatedOutput: true,
        modelId: true,
        provider: true,
        studioType: true,
        isFavorite: true,
        createdAt: true,
      }
    });

    // Combine and map data
    const combinedItems: any[] = [
      ...images.map(img => ({ ...img, type: 'image' })),
      ...prompts.map(p => ({
        id: p.id,
        prompt: p.promptText,
        resultUrl: p.generatedOutput || null,
        thumbnailUrl: null,
        modelId: p.modelId,
        provider: p.provider,
        studioType: p.studioType,
        isFavorite: p.isFavorite,
        createdAt: p.createdAt,
        type: 'prompt'
      }))
    ];

    // Sort by createdAt descending
    combinedItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination limit
    const hasMore = combinedItems.length > limit;
    const paginatedItems = combinedItems.slice(0, limit);

    return res.status(200).json(success({
      items: paginatedItems,
      nextCursor: hasMore && paginatedItems.length > 0 
        ? paginatedItems[paginatedItems.length - 1].createdAt.toISOString() 
        : null,
    }));
  } catch (err: any) {
    if (err.statusCode === 401) return res.status(401).json(error(err.message));
    console.error('My gallery error:', err);
    return res.status(500).json(error('Sunucu hatası'));
  }
}
