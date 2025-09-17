import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class FirebaseService {
  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          type: 'service_account',
          project_id: 'smarthome1-6a97d',
          private_key_id: '92060ea3bfb904c76cc3a5c7893e4fa363fe263e',
          private_key:
            '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDIOSrRPaN2TCjv\npvgboD4fmiMU2IhIJrcot8LcYcLDVUPTd/eMWJiwi97gbDKEAAK278ABLQRqorK/\nCDDTEJ8CD/GTT1PZ8pDxAjjMnwPtELN/qQXKWpsyLEF5AbHjtXE3ezWcRGX36TXT\nmjJWu+PiVmy5BsKNs7ErD5cg++sVfuPk+7kBTFvCevOuhj1DQw2gUDnj3VEKiA8d\no1rYY3nn7bvaW9U3dwfDQAFRHUOKHBNKhQBCKwV1oZphfLDPd8uCVTyIKilqXVKS\n/Han/n9J5EZOrTN+I353rb4+aPpX4g1UjIN2YA1eYaq5eaeOz5Zp9pf93BVF3BAy\nNWBF1oNjAgMBAAECggEAVoCsSP4SUxeQUAmZA4Z1kH2tTmJGbrWbSBIsM75gwLdj\nuEcKQi48uXmUbu0P3guLILHwCBIE6HUmOHY3cdiqed+dhQEuvuiXSiillXHV5mPi\nyPKjN8txZXnNR5Q94J0RLuEiRkMesr6krKjfuq0uRSkFi+Kpx0Ks9mej6XItHHmT\nw7C4yq9OuJ0vG+7Zabt9CrfCDz3ncE48w1UvNU6slIFezyZLdWEOkjMirZ+k5GYU\nOKHDNUZCBMwGiC4tCFlVJey2GVtT2yEIBF0DBCjlv5tFW7WNI/KLUbd8J5tPTins\nhVbbQJE9ApzUXEer5SV/Qr9oqS6aOzbllvPTi2Z0UQKBgQDUjm4QyOY4GyCs4TGk\nWeLxT6xJa1mjDPAC8aZMQDuuqII8sT2yx4In5zstDci/w7zWMirQF0xousEOPrgh\nWScNLmMOqammZ5ZSN2bgmjitrVg+GeLWWMmx8Uq195oYsNzAuIL3MGUJPmKCBJhP\nPjkzIrV3r9ZVmNBioH2ZIzfYnQKBgQDxJW+LcAoMXRZASDjvtFR+jsQesyO5uXp9\niZ9UC+MiUw70WfMguO9ASMpSrIP+7/Q34X0k1pJhiPfFnpyDinA6+vFwBBC/kQJ3\nPYoOCqCIWl9ShKeQisfgV2sP87QuzIga3ruWS+hEl4tdf6ly9i2l1uGLkT5Mok/v\nDIGY0FML/wKBgASH6La44ZdulJq6zikXtWu5bA3AmQ+NtgwKBKZ5dAw8EVKj4JHQ\nCOk615sVQSM9U+go95qp9HoDCRx5n8kuMlPomjn0yeX/LUghYDMHdo/VMx1XxesV\nx27gmtwYJBPEqV/+TuRgBrdUuhrVaD3AMM3zPnUHrYTzlfWUQDkkdAtNAoGBAJ2G\nYd5JWxcGe/GT/DWBrCxcIHsZdH3vTrfQ/daOSVpzvXIbjDnU9N0eb6Qf873Gi9cx\nImm9DTRPn+NlIELBXVz57lvJHBO3q0+vUI6pnIJV3qzt4PQH5FeFY3exMAPeMg6z\nbwDYJysff7edHFjvvZP20bE1OOggo2y507K6a3WLAoGAKJa6oNtQ5mklvclUbB76\nM8gwBy6vV5DOoCjtKa39PmSXyxrLa56y/+jrW76D/nBdiVW3kbjbCBEWE1icRH/Z\nyjnUXFyOtGQh54iO/3g/WWp25cIcsVQT83U9lnDO9dDtRMzJyw0/0SSdlZEEpq0W\nb35bkFHZtga/WALjLbfQZyQ=\n-----END PRIVATE KEY-----\n',
          client_email:
            'firebase-adminsdk-3cro0@smarthome1-6a97d.iam.gserviceaccount.com',
          client_id: '105126665181226758923',
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url:
            'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url:
            'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-3cro0%40smarthome1-6a97d.iam.gserviceaccount.com',
          universe_domain: 'googleapis.com',
        } as admin.ServiceAccount),
        storageBucket:
          process.env.FIREBASE_STORAGE_BUCKET || 'smarthome1-6a97d.appspot.com',
      });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: 'music' | 'covers' = 'music',
  ): Promise<string> {
    const bucket = admin.storage().bucket();
    const fileName = `${folder}/${uuidv4()}${path.extname(file.originalname)}`;
    const fileUpload = bucket.file(fileName);

    await fileUpload.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
    });

    return fileUpload.publicUrl();
  }

  async getSignedUrl(fileUrl: string): Promise<string> {
    try {
      const bucket = admin.storage().bucket();
      const urlObj = new URL(fileUrl);

      const pathWithBucket = urlObj.pathname.substring(1);
      const pathWithoutBucket = pathWithBucket.split('/').slice(1).join('/');
      const decodedPath = decodeURIComponent(pathWithoutBucket);
      const file = bucket.file(decodedPath);

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 3600 * 1000,
      });

      return signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return fileUrl;
    }
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      if (!fileUrl) {
        console.error('Error deleting file: fileUrl is null or undefined');
        return false;
      }

      console.log('Attempting to delete file:', fileUrl);

      const bucket = admin.storage().bucket();
      console.log('Storage bucket name:', bucket.name);

      try {
        const urlObj = new URL(fileUrl);
        console.log('URL object:', {
          href: urlObj.href,
          origin: urlObj.origin,
          pathname: urlObj.pathname,
          hostname: urlObj.hostname,
        });

        const pathSegments = urlObj.pathname.substring(1).split('/');
        console.log('Path segments before processing:', pathSegments);

        const bucketFromUrl = urlObj.hostname.split('.')[0];
        console.log('Bucket name from URL hostname:', bucketFromUrl);

        const possibleBucketName = pathSegments[0];
        console.log('Possible bucket name from path:', possibleBucketName);

        pathSegments.shift();

        const filePath = pathSegments.join('/');
        console.log('Final extracted file path:', filePath);

        if (!filePath) {
          console.error('Error deleting file: Extracted file path is empty');
          return false;
        }

        if (filePath.includes('%2F')) {
          console.log('URL contains encoded slashes, attempting to decode');
          const decodedPath = decodeURIComponent(filePath);
          console.log('Decoded path:', decodedPath);
          const file = bucket.file(decodedPath);
          const [exists] = await file.exists();

          if (exists) {
            await file.delete();
            console.log(
              `Successfully deleted file using decoded path: ${decodedPath}`,
            );
            return true;
          } else {
            console.log(`File does not exist at decoded path: ${decodedPath}`);
          }
        }

        const file = bucket.file(filePath);
        console.log('Firebase file path:', file.name);

        const [exists] = await file.exists();
        console.log(`File exists check: ${exists}`);

        if (!exists) {
          console.error(`File does not exist at path: ${filePath}`);

          const urlParts = fileUrl.split('/');
          const altFilePath = urlParts.slice(4).join('/');
          console.log('Trying alternative file path:', altFilePath);

          const altFile = bucket.file(altFilePath);
          const [altExists] = await altFile.exists();

          if (altExists) {
            console.log(`File exists at alternative path: ${altFilePath}`);
            await altFile.delete();
            console.log(
              `Successfully deleted file using alternative path: ${altFilePath}`,
            );
            return true;
          } else {
            console.log(
              `File also does not exist at alternative path: ${altFilePath}`,
            );
          }

          return false;
        }

        await file.delete();
        console.log(`Successfully deleted file: ${filePath}`);
        return true;
      } catch (err) {
        console.error('Error in URL parsing or file operations:', err);
        if (err instanceof Error) {
          console.error('Error details:', err.message);
        }

        try {
          console.log('Attempting alternative deletion approach');

          const parts = fileUrl.split('/');
          const pathParts = parts.slice(3);

          const bucketName = parts[3].split('.')[0];
          console.log(
            'Alternative approach - extracted bucket name:',
            bucketName,
          );

          const filePath = pathParts.slice(1).join('/');
          console.log('Alternative approach - extracted file path:', filePath);

          const file = bucket.file(filePath);
          const [exists] = await file.exists();

          if (exists) {
            await file.delete();
            console.log(`Alternative approach - deleted file: ${filePath}`);
            return true;
          } else {
            console.log(`Alternative approach - file not found: ${filePath}`);
            return false;
          }
        } catch (altErr) {
          console.error('Alternative deletion approach failed:', altErr);
          return false;
        }
      }
    } catch (error) {
      console.error('Error deleting file from Firebase:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return false;
    }
  }
}
