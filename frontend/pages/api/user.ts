import { NextApiRequest, NextApiResponse } from 'next';
import { getFirestoreAll } from '@/lib/firebase';
import { USER_ID } from '@/lib/seedData';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const users = await getFirestoreAll('user');
        if (users.length > 0) {
          res.status(200).json({ response: users[0] });
        } else {
          // Default reviewer user profile
          const defaultUser = {
            id: USER_ID,
            email: 'assurance.reviewer@ipa.gov.uk',
            created_datetime: new Date().toISOString(),
            updated_datetime: null
          };
          res.status(200).json({ response: defaultUser });
        }
      } catch (error) {
        console.error('[API /api/user] Error:', error);
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
