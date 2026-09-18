
import { NextApiRequest, NextApiResponse } from 'next'
import { createOrUpdateRating } from '@/utils/mockDb'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
): Promise<void> {
    const {
        body,
        method
    } = req
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

                const rating = createOrUpdateRating(result_id, good_response);
                res.status(200).json({ message: `Rating ${rating.id} submitted successfully` });
            } catch (error) {
                let message
                console.log(error)
                if (error instanceof Error) message = error.message
                res.status(500).send({ error: message })
            }
            break
        default:
            res.setHeader('Allow', ['POST'])
            res.status(405).end(`Method ${method} Not Allowed`)
            break
    }
}
