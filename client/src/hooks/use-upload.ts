import { useState, useCallback } from "react";
import type { UppyFile } from "@uppy/core";

interface UploadMetadata {
  name: string;
  size: number;
  contentType: string;
}

interface UploadResponse {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
  objectPath: string;
}

interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

async function compressImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // HEIC/HEIF (iOS camera) cannot be decoded by canvas in most browsers — skip compression
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".heic") || lowerName.endsWith(".heif") || file.type === "image/heic" || file.type === "image/heif") {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    const cleanup = () => {
      try { URL.revokeObjectURL(objectUrl); } catch {}
    };

    const finish = (result: File) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    // Hard timeout: if image never loads/decodes within 6s, skip compression and upload original.
    // iOS Safari can hang on certain HEIC/large images — keep this short so the UI never feels frozen.
    const timeoutId = setTimeout(() => {
      console.warn("Image compression timed out, uploading original");
      finish(file);
    }, 6000);

    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          finish(file);
          return;
        }

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              finish(compressedFile);
            } else {
              finish(file);
            }
          },
          "image/jpeg",
          quality
        );
      } catch (err) {
        console.warn("Image compression failed, uploading original:", err);
        finish(file);
      }
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      console.warn("Image load failed, uploading original");
      finish(file);
    };

    img.src = objectUrl;
  });
}

/**
 * React hook for handling file uploads with presigned URLs.
 *
 * This hook implements the two-step presigned URL upload flow:
 * 1. Request a presigned URL from your backend (sends JSON metadata, NOT the file)
 * 2. Upload the file directly to the presigned URL
 *
 * @example
 * ```tsx
 * function FileUploader() {
 *   const { uploadFile, isUploading, error } = useUpload({
 *     onSuccess: (response) => {
 *       console.log("Uploaded to:", response.objectPath);
 *     },
 *   });
 *
 *   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *     const file = e.target.files?.[0];
 *     if (file) {
 *       await uploadFile(file);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input type="file" onChange={handleFileChange} disabled={isUploading} />
 *       {isUploading && <p>Uploading...</p>}
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * Request a presigned URL from the backend (Cloudflare R2).
   * IMPORTANT: Send JSON metadata, NOT the file itself.
   */
  const requestUploadUrl = useCallback(
    async (file: File): Promise<UploadResponse> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch("/api/r2/request-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to get upload URL");
        }

        const data = await response.json();
        return {
          uploadUrl: data.uploadUrl,
          objectKey: data.objectKey,
          publicUrl: data.publicUrl,
          objectPath: data.publicUrl,
        };
      } catch (err: any) {
        if (err?.name === "AbortError") {
          throw new Error("Server javob bermadi. Internetni tekshiring.");
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    []
  );

  /**
   * Upload a file directly to the presigned URL.
   */
  const uploadToPresignedUrl = useCallback(
    async (file: File, uploadURL: string): Promise<void> => {
      // 60s timeout for the actual upload (slow mobile networks)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to upload file to storage");
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          throw new Error("Yuklash juda uzoq davom etdi. Internetni tekshiring.");
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    []
  );

  /**
   * Upload a file using the presigned URL flow.
   * Images are automatically compressed before uploading.
   *
   * @param file - The file to upload
   * @returns The upload response containing the object path
   */
  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        // Step 1: Compress image if it's an image file
        setProgress(5);
        const processedFile = await compressImage(
          file,
          options.maxWidth || 800,
          options.maxHeight || 1200,
          options.quality || 0.8
        );
        
        // Step 2: Request presigned URL (send metadata as JSON)
        setProgress(20);
        const uploadResponse = await requestUploadUrl(processedFile);

        // Step 3: Upload compressed file directly to presigned URL
        setProgress(40);
        await uploadToPresignedUrl(processedFile, uploadResponse.uploadUrl);

        setProgress(100);
        options.onSuccess?.(uploadResponse);
        return uploadResponse;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [requestUploadUrl, uploadToPresignedUrl, options]
  );

  /**
   * Get upload parameters for Uppy's AWS S3 plugin.
   *
   * IMPORTANT: This function receives the UppyFile object from Uppy.
   * Use file.name, file.size, file.type to request per-file presigned URLs.
   *
   * Use this with the ObjectUploader component:
   * ```tsx
   * <ObjectUploader onGetUploadParameters={getUploadParameters}>
   *   Upload
   * </ObjectUploader>
   * ```
   */
  const getUploadParameters = useCallback(
    async (
      file: UppyFile<Record<string, unknown>, Record<string, unknown>>
    ): Promise<{
      method: "PUT";
      url: string;
      headers?: Record<string, string>;
    }> => {
      // Use the actual file properties to request a per-file presigned URL from R2
      const response = await fetch("/api/r2/request-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const data = await response.json();
      return {
        method: "PUT",
        url: data.uploadUrl,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      };
    },
    []
  );

  return {
    uploadFile,
    getUploadParameters,
    isUploading,
    error,
    progress,
  };
}

