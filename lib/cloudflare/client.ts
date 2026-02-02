// Cloudflare Stream API client
// Note: Requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN env vars

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

export interface VideoUploadResponse {
  uid: string;
  thumbnail: string;
  readyToStream: boolean;
  status: {
    state: string;
    pctComplete: string;
  };
}

export async function uploadVideo(file: File): Promise<VideoUploadResponse> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    throw new Error('Cloudflare credentials not configured');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.result;
}

export async function getVideoDetails(videoId: string) {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    return null;
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${videoId}`,
    {
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get video details: ${response.statusText}`);
  }

  const data = await response.json();
  return data.result;
}

export function getStreamUrl(videoId: string): string {
  return `https://customer-${process.env.CLOUDFLARE_STREAM_SUBDOMAIN}.cloudflarestream.com/${videoId}/iframe`;
}

export function getThumbnailUrl(videoId: string): string {
  return `https://customer-${process.env.CLOUDFLARE_STREAM_SUBDOMAIN}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`;
}
