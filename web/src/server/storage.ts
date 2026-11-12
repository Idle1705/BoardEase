import "server-only";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/*
 * Listing photos in Neon Object Storage (S3-compatible, branch-aware: each Neon branch has its own
 * bucket contents, so test uploads on a dev branch never reach production).
 * The bucket is `public_read`: a photo is public once its random key is known, and keys are only
 * handed out for published listings (and to the owning owner). Postgres stores the key, never bytes.
 * Env (server only): S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.
 */

let client: S3Client | null = null;

function config() {
  const { S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_ENDPOINT || !S3_REGION || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) return null;
  return { endpoint: S3_ENDPOINT, region: S3_REGION, bucket: S3_BUCKET, key: S3_ACCESS_KEY_ID, secret: S3_SECRET_ACCESS_KEY };
}

export const storageConfigured = () => !!config();

function s3() {
  const c = config();
  if (!c) throw new Error("Photo storage is not configured.");
  client ??= new S3Client({
    endpoint: c.endpoint,
    region: c.region,
    forcePathStyle: true, // Neon Object Storage needs path-style addressing
    credentials: { accessKeyId: c.key, secretAccessKey: c.secret },
  });
  return { client, bucket: c.bucket };
}

/** Public URL for a stored key (bucket is public_read). Used by next/image as a remote source. */
export function photoUrl(key: string) {
  const c = config();
  if (!c) return "";
  return `${c.endpoint.replace(/\/$/, "")}/${c.bucket}/${key}`;
}

export async function putPhoto(key: string, body: Buffer, contentType: string) {
  const { client, bucket } = s3();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Keys are never reused (a new photo gets a new key), so caches can keep them for a year
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function deletePhoto(key: string) {
  const { client, bucket } = s3();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
