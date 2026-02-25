import * as Minio from "minio";

const isMock =
  (process.env.MOCK_MODE || "false").toLowerCase() === "true";

const BUCKET = process.env.MINIO_BUCKET;

/** @type {Minio.Client | null} */
let minioClient = null;

if (!isMock) {
  try {
    const endpoint = process.env.MINIO_ENDPOINT;
    const port = Number(process.env.MINIO_PORT);

    if (!endpoint || !port || !process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY || !BUCKET) {
      throw new Error("Missing required MinIO env vars (MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET)");
    }

    minioClient = new Minio.Client({
      endPoint: endpoint,
      port,
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
  } catch (err) {
    console.warn("MinIO client init failed (image storage disabled):", err.message);
  }
}

/**
 * Ensure the default bucket exists and has a public-read policy for images.
 */
export async function ensureBucket() {
  if (!minioClient) return;

  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) {
    await minioClient.makeBucket(BUCKET);
    console.log(`MinIO: Created bucket "${BUCKET}"`);
  }

  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${BUCKET}/*`],
      },
    ],
  };
  await minioClient.setBucketPolicy(BUCKET, JSON.stringify(policy));
}

export { minioClient, BUCKET };
