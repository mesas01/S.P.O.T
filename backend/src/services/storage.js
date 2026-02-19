import fs from "fs";
import path from "path";
import { minioClient, BUCKET } from "../lib/minio.js";
import { createImageRecord } from "./db.js";

const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL || "";

/**
 * Build the public URL for a MinIO object.
 */
function buildPublicUrl(key) {
  if (MINIO_PUBLIC_URL) {
    return `${MINIO_PUBLIC_URL.replace(/\/$/, "")}/${BUCKET}/${key}`;
  }
  const endpoint = process.env.MINIO_ENDPOINT || "localhost";
  const port = process.env.MINIO_PORT || "9000";
  return `http://${endpoint}:${port}/${BUCKET}/${key}`;
}

/**
 * Upload an image from Multer's temp file to MinIO and create an Image record.
 * Returns { publicUrl, imageId } or null if MinIO is not available.
 */
export async function uploadImage(file) {
  if (!minioClient || !file) return null;

  const ext = path.extname(file.originalname).toLowerCase();
  const key = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  await minioClient.fPutObject(BUCKET, key, file.path, {
    "Content-Type": file.mimetype,
  });

  const publicUrl = buildPublicUrl(key);

  const imageRecord = await createImageRecord({
    bucket: BUCKET,
    key,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    publicUrl,
  });

  // Clean up temp file after successful upload
  try {
    await fs.promises.unlink(file.path);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.warn("Failed to remove temp file after MinIO upload:", err.message);
    }
  }

  return {
    publicUrl,
    imageId: imageRecord?.id ?? null,
  };
}

/**
 * Delete an image from MinIO.
 */
export async function deleteImage(key) {
  if (!minioClient) return;
  await minioClient.removeObject(BUCKET, key);
}
