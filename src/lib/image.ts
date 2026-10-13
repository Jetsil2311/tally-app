// Receipt photos: phone pictures are several MB, more than a request can
// carry (Vercel's limit is 4.5 MB, base64 adds a third). Scaled to at most
// 1600 px and re-encoded as JPEG they're a few hundred KB, still sharp
// enough to read. Formats the browser can't draw (HEIC on Chrome) go as
// they are when they're small enough.
const MAX_SIDE = 1600;
const RAW_LIMIT = 2.8 * 1024 * 1024;

export async function photoForUpload(file: File): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (blob) return { base64: await toBase64(blob), mimeType: "image/jpeg" };
  } catch {}
  if (file.size > RAW_LIMIT) return null;
  return { base64: await toBase64(file), mimeType: file.type || "image/jpeg" };
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]+,/, ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
