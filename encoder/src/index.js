import { PubSub } from "@google-cloud/pubsub";
import { Storage } from "@google-cloud/storage";
import { execa } from "execa";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import pino from "pino";
import axios from "axios";

const log = pino({ level: process.env.LOG_LEVEL || "info" });

// Required envs
const PROJECT_ID = process.env.GCP_PROJECT_ID;
const KEY_FILE = process.env.GCP_KEY_FILE_PATH; // mount into container
const SOURCE_BUCKET = process.env.GCS_SOURCE_BUCKET;
const PUBLIC_BUCKET = process.env.GCS_PUBLIC_BUCKET;
const SUBSCRIPTION = process.env.PUBSUB_SUBSCRIPTION || "vod-uploads-sub";
const CALLBACK_BASE = process.env.ENCODER_CALLBACK_BASE; // e.g. https://api.example.com/admin
const CALLBACK_SECRET = process.env.ENCODER_CALLBACK_SECRET;
const SEG_SECONDS = parseInt(process.env.HLS_SEGMENT_SECONDS || "4", 10);
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || "1", 10);

if (
  !PROJECT_ID ||
  !SOURCE_BUCKET ||
  !PUBLIC_BUCKET ||
  !CALLBACK_BASE ||
  !CALLBACK_SECRET
) {
  log.error(
    "Missing required envs. Ensure GCP_PROJECT_ID, GCS_SOURCE_BUCKET, GCS_PUBLIC_BUCKET, ENCODER_CALLBACK_BASE, ENCODER_CALLBACK_SECRET are set."
  );
  process.exit(1);
}

// Log effective non-secret configuration on startup
log.info(
  {
    projectId: PROJECT_ID,
    sourceBucket: SOURCE_BUCKET,
    publicBucket: PUBLIC_BUCKET,
    subscription: SUBSCRIPTION,
    callbackBase: CALLBACK_BASE,
    segSeconds: SEG_SECONDS,
    maxConcurrent: MAX_CONCURRENT,
  },
  "Encoder configuration"
);

const storage = new Storage({ projectId: PROJECT_ID, keyFilename: KEY_FILE });
const pubsub = new PubSub({ projectId: PROJECT_ID, keyFilename: KEY_FILE });

// Utilities
function parseObjectName(name) {
  // Accept both:
  // 1) `${assetId}-originalName.ext`
  // 2) `uploads/<adminId>/<courseId>/<assetId>/<assetId>-originalName.ext`
  const segments = name.split("/");
  const base = segments[segments.length - 1];
  const dash = base.indexOf("-");
  if (dash <= 0) return null;
  const assetIdFromFile = base.substring(0, dash);

  let adminId, courseId, assetIdFolder;
  if (segments.length >= 5 && segments[0] === "uploads") {
    adminId = segments[1];
    courseId = segments[2];
    assetIdFolder = segments[3];
    if (assetIdFolder && assetIdFolder !== assetIdFromFile) {
      log.warn(
        { name, assetIdFolder, assetIdFromFile },
        "AssetId mismatch between folder and filename"
      );
    }
  }
  return { assetId: assetIdFromFile, adminId, courseId };
}

async function downloadObject(bucketName, objectName, destPath) {
  await storage
    .bucket(bucketName)
    .file(objectName)
    .download({ destination: destPath });
}

async function uploadDir(localDir, bucketName, remotePrefix) {
  const entries = await fs.readdir(localDir, { withFileTypes: true });
  for (const e of entries) {
    const local = path.join(localDir, e.name);
    const remote = `${remotePrefix}/${e.name}`;
    if (e.isDirectory()) {
      await uploadDir(local, bucketName, remote);
    } else {
      await storage.bucket(bucketName).upload(local, {
        destination: remote,
        resumable: false,
        metadata: {
          cacheControl:
            remote.endsWith(".m3u8") || remote.endsWith(".vtt")
              ? "public, max-age=3600"
              : "public, max-age=31536000",
          contentType: guessContentType(remote),
        },
      });
    }
  }
}

function guessContentType(name) {
  if (name.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (name.endsWith(".ts")) return "video/mp2t";
  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".jpg")) return "image/jpeg";
  if (name.endsWith(".vtt")) return "text/vtt";
  return "application/octet-stream";
}

async function runFfmpegHls(inputPath, outDir) {
  const resolutions = [
    {
      name: "1080",
      width: 1920,
      height: 1080,
      videoBitrate: "5000k",
      audioBitrate: "160k",
    },
    {
      name: "720",
      width: 1280,
      height: 720,
      videoBitrate: "2800k",
      audioBitrate: "128k",
    },
    {
      name: "480",
      width: 854,
      height: 480,
      videoBitrate: "1400k",
      audioBitrate: "96k",
    },
  ];

  const promises = resolutions.map(async (res) => {
    const outputDir = path.join(outDir, res.name);
    await fs.mkdir(outputDir, { recursive: true });

    const playlistPath = path.join(outputDir, "index.m3u8");
    const segmentPath = path.join(outputDir, "%d.ts");

    const args = [
      "-y",
      "-i",
      inputPath,
      "-c:v",
      "h264_videotoolbox", // M2 GPU hardware acceleration
      "-b:v",
      res.videoBitrate,
      "-maxrate",
      res.videoBitrate,
      "-bufsize",
      `${parseInt(res.videoBitrate) * 2}k`,
      "-vf",
      `scale=${res.width}:${res.height}`,
      "-c:a",
      "aac",
      "-b:a",
      res.audioBitrate,
      "-ac",
      "2",
      "-f",
      "hls",
      "-hls_time",
      "4",
      "-hls_playlist_type",
      "vod",
      "-hls_segment_filename",
      segmentPath,
      playlistPath,
    ];

    await execa("ffmpeg", args, { stdio: "inherit" });
  });

  await Promise.all(promises);
}

async function runFfmpegMp4(inputPath, outDir) {
  const out = path.join(outDir, "download.mp4");
  const args = [
    "-y",
    "-i",
    inputPath,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "21",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    out,
  ];
  await execa("ffmpeg", args, { stdio: "inherit" });
}

async function extractThumbnail(inputPath, outDir) {
  const out = path.join(outDir, "thumbnail.jpg");
  const args = [
    "-y",
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    "-f",
    "image2",
    out,
  ];

  // Add timeout to prevent hanging
  try {
    await execa("ffmpeg", args, {
      stdio: "inherit",
      timeout: 30000, // 30 second timeout
    });
  } catch (error) {
    if (error.timedOut) {
      log.warn("Thumbnail generation timed out, creating fallback");
      // Create a simple fallback thumbnail
      const fallbackArgs = [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=gray:s=320x240:d=1",
        "-frames:v",
        "1",
        out,
      ];
      await execa("ffmpeg", fallbackArgs, { stdio: "inherit" });
    } else {
      throw error;
    }
  }
}

async function processObject(objectName) {
  log.info({ objectName }, "Processing GCS object");
  const parsed = parseObjectName(objectName);
  if (!parsed) {
    log.warn(
      { objectName },
      "Object name doesn't match expected pattern; skipping"
    );
    return;
  }
  const { assetId, adminId, courseId } = parsed;

  // Build a safe mkdtemp prefix and ensure parent exists.
  // This supports both nested (admin/course/asset) and flat layouts.
  let tmpPrefixDir;
  if (adminId && courseId) {
    tmpPrefixDir = path.join(
      os.tmpdir(),
      "enc-uploads",
      adminId,
      courseId,
      assetId
    );
  } else {
    tmpPrefixDir = path.join(os.tmpdir(), "enc", assetId);
  }
  await fs.mkdir(tmpPrefixDir, { recursive: true });
  const tmpDir = await fs.mkdtemp(path.join(tmpPrefixDir, `${assetId}-`));
  const inputPath = path.join(tmpDir, "input" + path.extname(objectName));
  const outDir = path.join(tmpDir, "out");
  await fs.mkdir(outDir, { recursive: true });

  try {
    await downloadObject(SOURCE_BUCKET, objectName, inputPath);
    await runFfmpegHls(inputPath, outDir);
    await runFfmpegMp4(inputPath, outDir);
    await extractThumbnail(inputPath, outDir);

    const remotePrefix =
      adminId && courseId
        ? `assets/${adminId}/${courseId}/${assetId}`
        : `assets/${assetId}`;
    await uploadDir(outDir, PUBLIC_BUCKET, remotePrefix);

    // Callback to backend to mark encoded
    const url = `${CALLBACK_BASE}/videos/${assetId}/encoded`;
    await axios.post(
      url,
      {},
      { headers: { "x-encoder-secret": CALLBACK_SECRET } }
    );

    log.info({ assetId }, "Encoding complete and callback sent");
  } catch (err) {
    log.error({ err }, "Processing failed");
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

async function start() {
  log.info("Starting encoder worker (Docker)");
  const sub = pubsub.subscription(SUBSCRIPTION, {
    flowControl: { maxMessages: MAX_CONCURRENT },
  });

  sub.on("message", async (m) => {
    try {
      // Prefer attributes.objectId provided by GCS notifications
      const attrs = m.attributes || {};
      let obj = attrs.objectId;
      if (!obj) {
        // Fallback to parsing data.name if custom JSON published
        try {
          const data = JSON.parse(m.data.toString());
          obj = data && data.name;
        } catch {}
      }
      if (!obj) {
        log.warn(
          { attributes: attrs },
          "Unknown message format (no objectId/name)"
        );
        m.ack();
        return;
      }
      await processObject(obj);
      m.ack();
    } catch (err) {
      log.error({ err }, "Message handling failed");
      // Nack to retry later
      try {
        m.nack();
      } catch {}
    }
  });

  sub.on("error", (err) => {
    log.error({ err }, "Subscription error");
  });

  // Announce and keep the process alive
  log.info({ subscription: SUBSCRIPTION }, "Listening for Pub/Sub messages");
  await new Promise(() => {});
}

start().catch((e) => {
  log.error(e, "Fatal start error");
  process.exit(1);
});
