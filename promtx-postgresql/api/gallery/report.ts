import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma';
import { authenticate } from '../_lib/auth';
import { success, error } from '../_lib/errors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json(error('Method not allowed'));

  try {
    const authUser = await authenticate(req);

    const { imageId, reason } = req.body || {};
    if (!imageId || !reason) {
      return res.status(400).json(error('Missing imageId or reason'));
    }

    const image = await prisma.imageGeneration.findUnique({
      where: { id: imageId }
    });

    if (!image) return res.status(404).json(error('Görsel bulunamadı'));

    // Create the report
    await prisma.imageReport.create({
      data: {
        userId: authUser.userId,
        imageGenerationId: imageId,
        reason: reason.substring(0, 500),
      }
    });

    // Check the total reports count for this image
    const reportCount = await prisma.imageReport.count({
      where: { imageGenerationId: imageId }
    });

    // Auto-hide after 3 reports
    if (reportCount >= 3 && image.isPublic) {
      await prisma.imageGeneration.update({
        where: { id: imageId },
        data: { isPublic: false, isNsfw: true }
      });
    }

    return res.status(200).json(success({ reported: true }));
  } catch (err: any) {
    if (err.statusCode === 401) return res.status(401).json(error(err.message));
    console.error('Report API error:', err);
    return res.status(500).json(error('Sunucu hatası'));
  }
}
