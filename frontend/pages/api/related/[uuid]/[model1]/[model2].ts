import { NextApiRequest, NextApiResponse } from 'next';
import { getFirestoreRelatedItems } from '@/lib/firebase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const {
    query: { uuid, model1, model2, limit_to_user },
    method
  } = req;

  switch (method) {
    case 'GET':
      try {
        if (typeof uuid !== 'string' || typeof model1 !== 'string' || typeof model2 !== 'string') {
          res.status(400).json({ error: 'uuid, model1, and model2 are required and must be strings' });
          return;
        }

        const limitUser = limit_to_user === 'true';
        const related = await getFirestoreRelatedItems(uuid, model1, model2, limitUser);
        res.status(200).json(related);
      } catch (error) {
        console.error('[API /api/related] Error querying Firestore:', error);
        const message = error instanceof Error ? error.message : 'Database error';
        res.status(500).json({ error: message });
      }
      break;
    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${method} Not Allowed`);
      break;
  }
}
