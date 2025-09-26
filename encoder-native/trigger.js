import { PubSub } from "@google-cloud/pubsub";
import { Storage } from "@google-cloud/storage";
import pino from "pino";

const logger = pino();

// Configuration
const PROJECT_ID = process.env.GCP_PROJECT_ID || "subtle-girder-469110-b8";
const SOURCE_BUCKET =
  process.env.GCP_SOURCE_BUCKET || "subtle-girder-469110-b8-vod-source";
const TOPIC_NAME = process.env.GCP_TOPIC || "vod-uploads";

// Initialize Google Cloud clients
const storage = new Storage({
  projectId: PROJECT_ID,
  keyFilename:
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    "../Backend/gcp-credentials.json",
});

const pubsub = new PubSub({
  projectId: PROJECT_ID,
  keyFilename:
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    "../Backend/gcp-credentials.json",
});

async function listVideosInBucket() {
  const bucket = storage.bucket(SOURCE_BUCKET);
  const [files] = await bucket.getFiles({
    prefix: "",
    delimiter: "/",
  });

  const videoFiles = files.filter((file) => file.name.endsWith(".mp4"));
  return videoFiles.map((file) => ({
    name: file.name,
    size: file.metadata.size,
    created: file.metadata.timeCreated,
    updated: file.metadata.updated,
  }));
}

async function triggerVideoProcessing(videoName) {
  const topic = pubsub.topic(TOPIC_NAME);

  const message = {
    name: videoName,
    bucket: SOURCE_BUCKET,
    eventType: "OBJECT_FINALIZE",
    triggeredBy: "manual",
    timestamp: new Date().toISOString(),
  };

  const messageId = await topic.publishMessage({
    data: Buffer.from(JSON.stringify(message)),
  });

  logger.info({ videoName, messageId }, "Triggered video processing");
  return messageId;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // List all videos in bucket
    logger.info("Listing videos in bucket...");
    const videos = await listVideosInBucket();

    console.log("\n📹 Videos in bucket:");
    console.log("=".repeat(80));
    videos.forEach((video, index) => {
      const sizeGB = (parseInt(video.size) / (1024 * 1024 * 1024)).toFixed(2);
      console.log(`${index + 1}. ${video.name}`);
      console.log(`   Size: ${sizeGB} GB`);
      console.log(`   Created: ${new Date(video.created).toLocaleString()}`);
      console.log("");
    });

    console.log("Usage:");
    console.log("  node trigger.js <video-name>     # Process specific video");
    console.log("  node trigger.js --all            # Process all videos");
    console.log("  node trigger.js --list           # List videos only");
  } else if (args[0] === "--list") {
    // Just list videos
    const videos = await listVideosInBucket();
    videos.forEach((video) => console.log(video.name));
  } else if (args[0] === "--all") {
    // Process all videos
    const videos = await listVideosInBucket();
    logger.info({ count: videos.length }, "Processing all videos");

    for (const video of videos) {
      await triggerVideoProcessing(video.name);
      // Small delay to avoid overwhelming
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } else {
    // Process specific video
    const videoName = args[0];
    logger.info({ videoName }, "Processing specific video");
    await triggerVideoProcessing(videoName);
  }
}

main().catch((error) => {
  logger.error({ err: error }, "Trigger script failed");
  process.exit(1);
});
