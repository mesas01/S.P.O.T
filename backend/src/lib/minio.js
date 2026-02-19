import * as Minio from "minio";

const isMock =
  (process.env.MOCK_MODE || "false").toLowerCase() === "true";

const BUCKET = process.env.MINIO_BUCKET || "spot-images";

/** @type {Minio.Client | null} */
let minioClient = null;

if (!isMock) {
  const endpoint = process.env.MINIO_ENDPOINT || "localhost";
  const port = Number(process.env.MINIO_PORT || 9000);

  minioClient = new Minio.Client({
    endPoint: endpoint,
    port,
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || "spot_minio",
    secretKey: process.env.MINIO_SECRET_KEY || "spot_minio_secret",
  });
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
