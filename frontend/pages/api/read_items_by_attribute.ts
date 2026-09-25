import { NextApiRequest, NextApiResponse } from 'next';
import { queryFirestoreByAttribute } from '@/lib/firebase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const { body, method } = req;

  switch (method) {
    case 'POST':
      try {
        let parsedBody = body;
        if (typeof body === 'string') {
          parsedBody = JSON.parse(body);
        }

        const model = parsedBody?.model;
        const filters = parsedBody?.filters || {};

        if (!model) {
          res.status(400).json({ error: 'Model parameter is required' });
          return;
        }

        const results = await queryFirestoreByAttribute(model, filters);
        res.status(200).json(results);
      } catch (error) {
        console.error('[API /api/read_items_by_attribute] Error querying Firestore:', error);
        const message = error instanceof Error ? error.message : 'Database error';
        res.status(500).json({ error: message });
      }
      break;
    default:
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
      break;
  }
}
