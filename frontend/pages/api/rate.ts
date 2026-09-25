import { NextApiRequest, NextApiResponse } from 'next';
import { rateFirestoreResponse } from '@/lib/firebase';

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

        const result_id = parsedBody?.result_id;
        const good_response = parsedBody?.good_response;

        if (!result_id) {
          res.status(400).json({ error: 'result_id is required' });
          return;
        }

        const rating = await rateFirestoreResponse(result_id, Boolean(good_response));
        res.status(200).json({ message: `Rating ${rating.id} submitted successfully to Firestore` });
      } catch (error) {
        console.error('[API /api/rate] Error persisting rating to Firestore:', error);
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
