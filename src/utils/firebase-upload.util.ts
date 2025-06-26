import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';

export async function uploadFileToFirebase(
  buffer: Buffer,
  destination: string,
  mimetype: string,
): Promise<string> {
  const storage = getStorage();
  const bucket = storage.bucket();
  const filename = `${destination}${uuidv4()}`;
  const file = bucket.file(filename);

  await file.save(buffer, {
    metadata: {
      contentType: mimetype,
      metadata: {
        firebaseStorageDownloadTokens: uuidv4(),
      },
    },
    public: true,
    validation: 'md5',
  });

  await file.makePublic();

  return file.publicUrl();
}
