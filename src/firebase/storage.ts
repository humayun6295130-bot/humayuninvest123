import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

const DEFAULT_BUCKET_PATH = 'receipts';

export async function uploadFile(
    file: File,
    userId: string,
    path: string = DEFAULT_BUCKET_PATH
): Promise<string> {
    if (!storage) {
        throw new Error('Firebase Storage is not configured. Please check your environment variables.');
    }
    try {
        const fileName = `${userId}/${Date.now()}_${file.name}`;
        const fileRef = ref(storage, `${path}/${fileName}`);

        await uploadBytes(fileRef, file, {
            contentType: file.type,
        });

        // Get download URL
        const downloadURL = await getDownloadURL(fileRef);
        return downloadURL;
    } catch (error: any) {
        console.error('Upload error:', error.message);
        throw error;
    }
}

export async function getPublicUrl(path: string): Promise<string> {
    if (!storage) {
        throw new Error('Firebase Storage is not configured. Please check your environment variables.');
    }
    try {
        const fileRef = ref(storage, path);
        return await getDownloadURL(fileRef);
    } catch (error: any) {
        console.error('Get URL error:', error.message);
        throw error;
    }
}
