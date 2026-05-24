// Document storage abstraction.
//
// For now this persists the (already client-downscaled) data URL straight onto
// the Document row, so the foundation works with zero extra infrastructure.
//
// To flip on real Vercel Blob storage, install `@vercel/blob` and replace the
// body of `putDocument` with:
//
//   import { put } from "@vercel/blob";
//   const blob = await put(`documents/${driverId}/${kind}`, file, {
//     access: "public",
//     token: process.env.BLOB_READ_WRITE_TOKEN,
//   });
//   return blob.url;

export async function putDocument(dataUrlOrUrl: string): Promise<string> {
  return dataUrlOrUrl;
}
