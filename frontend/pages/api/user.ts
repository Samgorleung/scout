import { NextApiRequest, NextApiResponse } from 'next'
import { getAll } from '@/utils/mockDb'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
): Promise<void> {
    const { method } = req
    switch (method) {
        case 'GET':
            try {
                const users = getAll('user')
                if (users.length > 0) {
                    res.status(200).json({ response: users[0] })
                } else {
                    res.status(404).json({ error: 'User not found' })
                }
            } catch (error) {
                let message
                console.log(error)
                if (error instanceof Error) message = error.message
                res.status(500).send({ error: message })
            }
            break
        default:
            res.setHeader('Allow', ['GET'])
            res.status(405).end(`Method ${method} Not Allowed`)
            break
    }
}
