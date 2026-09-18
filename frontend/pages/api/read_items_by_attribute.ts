import { NextApiRequest, NextApiResponse } from 'next'
import { filterItems } from '@/utils/mockDb'

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

                const model = parsedBody?.model;
                const filters = parsedBody?.filters || {};

                if (!model) {
                    res.status(400).json({ error: 'Model is required' });
                    return;
                }

                const results = filterItems(model, filters);
                res.status(200).json(results);
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
