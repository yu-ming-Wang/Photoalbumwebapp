// src/api.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

if (!API_BASE_URL) {
  console.warn("VITE_API_BASE_URL is not set. Please add it in .env.local");
}

export interface Photo {
  url: string;
  labels?: string[];
}

// --------- GET /search ----------

export async function searchPhotos(query: string): Promise<Photo[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `${API_BASE_URL}/search?q=${encodeURIComponent(trimmed)}`;

  const res = await fetch(url, {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("searchPhotos failed:", res.status, text);
    throw new Error("Search failed");
  }

  const data = await res.json();
  return data.results || data.photos || [];
}

// --------- PUT /photos/{objectKey} (S3 Proxy) ----------

export interface UploadParams {
  file: File;
  customLabels: string[];
}

/**
 * Upload photos through API Gateway → S3 Proxy
 * PUT /photos/{objectKey} + x-amz-meta-customLabels metadata header
 */
export async function uploadPhotoToS3ViaApiGateway({
  file,
  customLabels,
}: UploadParams): Promise<void> {
  const url = `${API_BASE_URL}/photos/${encodeURIComponent(file.name)}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "image/jpeg",
      "x-amz-meta-customLabels": customLabels.join(", "),
    },
    body: file, // Send raw binary data
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("uploadPhotoToS3ViaApiGateway failed:", res.status, text);
    throw new Error("Upload failed");
  }
}
