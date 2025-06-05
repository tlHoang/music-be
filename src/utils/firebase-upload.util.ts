import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads a file buffer to Firebase Storage and returns the public URL.
 * @param buffer - The file buffer (image or audio)
 * @param destination - The destination path in the bucket (e.g., 'avatars/', 'covers/')
 * @param mimetype - The file's mimetype (e.g., 'image/jpeg')
 */
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

  // Make the file public
  await file.makePublic();

  // Return the public URL
  return file.publicUrl();
}
