
import { NextApiRequest, NextApiResponse } from 'next'
import { getById, getAll } from '@/utils/mockDb'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
): Promise<void> {
    const {
        query,
        method
    } = req
    switch (method) {
        case 'GET':
            try {
                const table = query.table as string
                const uuid = query.uuid as string

                if (!table) {
                    res.status(400).json({ error: 'Table is required' })
                    return
                }

                if (uuid) {
                    const item = getById(table, uuid)
                    if (!item) {
                        res.status(404).json({ error: 'Item not found' })
                        return
                    }
                    res.status(200).json(item)
                } else {
                    const items = getAll(table)
                    res.status(200).json(items)
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
