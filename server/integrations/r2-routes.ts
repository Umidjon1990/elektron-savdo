import type { Express, Request, Response } from "express";
import { isR2Configured, getPresignedUploadUrl, getPresignedDownloadUrl, generateObjectKey, getPublicUrl, s3Client, R2_BUCKET_NAME } from "./r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";

async function handleUploadRequest(req: Request, res: Response) {
  try {
    if (!isR2Configured()) {
      return res.status(503).json({ 
        error: "R2 storage not configured",
        message: "Please configure R2 credentials in environment variables"
      });
    }

    const { filename, name, contentType } = req.body;
    const actualFilename = filename || name;

    if (!actualFilename || !contentType) {
      return res.status(400).json({ error: "filename and contentType are required" });
    }

    const objectKey = generateObjectKey(actualFilename);
    const uploadUrl = await getPresignedUploadUrl(objectKey, contentType);
    const publicUrl = getPublicUrl(objectKey);

    res.json({
      uploadUrl,
      objectKey,
      publicUrl,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
}

export function registerR2Routes(app: Express): void {
  app.post("/api/r2/request-url", handleUploadRequest);
  app.post("/api/uploads/request-url", handleUploadRequest);

  app.get("/r2/:key(*)", async (req: Request, res: Response) => {
    try {
      if (!isR2Configured()) {
        return res.status(503).json({ error: "R2 storage not configured" });
      }

      const key = req.params.key;
      
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      if (response.ContentType) {
        res.setHeader("Content-Type", response.ContentType);
      }
      if (response.ContentLength) {
        res.setHeader("Content-Length", response.ContentLength);
      }
      res.setHeader("Cache-Control", "public, max-age=31536000");
      
      if (response.Body) {
        const stream = response.Body as NodeJS.ReadableStream;
        stream.pipe(res);
      } else {
        res.status(404).json({ error: "Object not found" });
      }
    } catch (error) {
      console.error("Error getting object:", error);
      res.status(404).json({ error: "Object not found" });
    }
  });
}
