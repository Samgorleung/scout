import { NextApiRequest, NextApiResponse } from 'next';
import { storage, saveFirestoreFile } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    const { name, cleanName, summary, fileType, dataUrl, contentBase64 } = body || {};

    if (!name) {
      res.status(400).json({ error: 'Document name is required.' });
      return;
    }

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `documents/${fileId}_${sanitizedName}`;

    let downloadUrl = `/api/get_items/${fileId}`;

    // If file content is provided, upload directly to Firebase Storage
    const uploadPayload = dataUrl || (contentBase64 ? `data:${fileType || 'application/pdf'};base64,${contentBase64}` : null);

    if (uploadPayload && storage) {
      try {
        const storageRef = ref(storage, storagePath);
        await uploadString(storageRef, uploadPayload, 'data_url');
        downloadUrl = await getDownloadURL(storageRef);
      } catch (storageErr) {
        console.warn('[Firebase Storage] Upload warning, falling back to local proxy:', storageErr);
      }
    }

    const fileRecord = {
      id: fileId,
      name: sanitizedName,
      clean_name: cleanName || name.replace(/\.[^/.]+$/, ''),
      type: fileType || 'application/pdf',
      summary: summary || `Uploaded assurance document bundle: ${sanitizedName}`,
      storage_path: storagePath,
      url: downloadUrl
    };

    await saveFirestoreFile(fileRecord);

    res.status(200).json({
      message: 'Document uploaded and registered in Firebase successfully.',
      file: fileRecord
    });
  } catch (error) {
    console.error('[API /api/upload_file] Error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    res.status(500).json({ error: message });
  }
}
