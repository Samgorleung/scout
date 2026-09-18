import { NextApiRequest, NextApiResponse } from 'next'

const mockPdfBase64 = "JVBERi0xLjQKMSAwIG9iagogIDw8L1R5cGUgL0NhdGFsb2cKICAgIC9QYWdlcyAyIDAgUgoKICA+PgplbmRvYmoKMiAwIG9iagogIDw8L1R5cGUgL1BhZ2VzCiAgICAvS2lkcyBbMyAwIFJdCiAgICAvQ291bnQgMQogID4+CmVuZG9iagozIDAgb2JqCiAgPDwvVHlwZSAvUGFnZQogICAgL1BhcmVudCAyIDAgUgogICAgL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KICAgIC9Db250ZW50cyA0IDAgUgogICAgL1Jlc291cmNlcyA8PC9Gb250IDw8L0YxIDUgMCBSPj4+PgogID4+CmVuZG9iago0IDAgb2JqCiAgPDwvTGVuZ3RoIDkyPj4Kc3RyZWFtCkJUCi9GMSAyNCBUZgoxMDAgNzAwIFRkCihJUEEgU2NvdXQgRG9jdW1lbnQgVmlld2VyKSBUagowIC00MCBUZgoxMiBUZgooVGhpcyBpcyBhIG1vY2sgUERGIGZvciB0aGUgc2VsZWN0ZWQgZG9jdW1lbnQuIFBsZWFzZSByZWZlciB0byBSZXN1bHRzIGZvciBBSSBKdXN0aWZpY2F0aW9uLikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago1IG8gYmoKICA8PC9UeXBlIC9Gb250CiAgICAvU3VidHlwZSAvVHlwZTEKICAgIC9CYXNlRm9udCAvSGVsdmV0aWNhCiAgPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNyAwMDAwMCBuIAowMDAwMDAwMDc5IDAwMDAwIG4gCjAwMDAwMDAxNDQgMDAwMDAgbiAKMDAwMDAwMDI3MSAwMDAwMCBuIAowMDAwMDAwNDE0IDAwMDAwIG4gCnRyYWlsZXIKICA8PC9TaXplIDYKICAgIC9Sb290IDEgMCBSCgogID4+CnN0YXJ0eHJlZgoxNzIKJSVFT0Y=";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
): Promise<void> {
    const {
        method
    } = req
    switch (method) {
        case 'GET':
            try {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
                res.setHeader('X-File-Type', 'application/pdf');
                res.status(200);
                res.send(Buffer.from(mockPdfBase64, 'base64'));
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
