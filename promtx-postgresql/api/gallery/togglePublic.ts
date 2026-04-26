import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma';
import { authenticate } from '../_lib/auth';
import { success, error } from '../_lib/errors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json(error('Method not allowed'));

  try {
    const authUser = await authenticate(req);

    const { imageId } = req.body || {};
    if (!imageId) return res.status(400).json(error('Missing imageId'));

    const image = await prisma.imageGeneration.findUnique({
      where: { id: imageId }
    });

    if (!image) return res.status(404).json(error('Görsel bulunamadı'));

    if (image.userId !== authUser.userId) {
      return res.status(403).json(error('Bu işlem için yetkiniz yok'));
    }

    const updatedImage = await prisma.imageGeneration.update({
      where: { id: imageId },
      data: { isPublic: !image.isPublic }
    });

    return res.status(200).json(success({ isPublic: updatedImage.isPublic }));
  } catch (err: any) {
    if (err.statusCode === 401) return res.status(401).json(error(err.message));
    console.error('Toggle public error:', err);
    return res.status(500).json(error('Sunucu hatası'));
  }
}
