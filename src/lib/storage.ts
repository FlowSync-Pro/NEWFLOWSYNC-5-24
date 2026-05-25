import { put } from "@vercel/blob";

// Document storage. When BLOB_READ_WRITE_TOKEN is set, uploads go to Vercel Blob
// and we store the returned public URL. Without a token (local dev), we fall back
// to storing the data URL inline so the flow still works.

export async function putDocument(dataUrl: string, pathname: string): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const match = /^data:(.+?);base64,(.*)$/.exec(dataUrl);

  if (!token || !match) return dataUrl;

  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const ext = (contentType.split("/")[1] || "jpg").replace("+xml", "");

  const blob = await put(`${pathname}.${ext}`, buffer, {
    access: "public",
    token,
    contentType,
    addRandomSuffix: true,
  });
  return blob.url;
}
