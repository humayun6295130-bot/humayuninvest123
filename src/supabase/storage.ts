import { supabase } from './config';

const BUCKET_NAME = 'receipts';

export async function uploadFile(
    file: File,
    userId: string
): Promise<string> {
    const fileName = `${userId}/${Date.now()}_${file.name}`;

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
        });

    if (error) {
        console.error('Upload error:', error.message);
        throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

    return urlData.publicUrl;
}

export function getPublicUrl(path: string): string {
    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);

    return data.publicUrl;
}
