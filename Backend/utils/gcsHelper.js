const { Storage } = require("@google-cloud/storage");

// Initialize GCS client
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEY_FILE_PATH,
});

const sourceBucket = storage.bucket(process.env.GCS_SOURCE_BUCKET);
const publicBucket = storage.bucket(process.env.GCS_PUBLIC_BUCKET);

/**
 * Delete all video assets for a specific assetId from both source and public buckets
 * @param {string} adminId - Admin ID
 * @param {string} courseId - Course ID
 * @param {string} assetId - Asset ID
 * @returns {Promise<void>}
 */
async function deleteVideoAssets(adminId, courseId, assetId) {
  const sourcePrefix = `uploads/${adminId}/${courseId}/${assetId}/`;
  const publicPrefix = `assets/${adminId}/${courseId}/${assetId}/`;

  try {
    console.log(
      `[GCS] Deleting assets for admin=${adminId} course=${courseId} asset=${assetId}`
    );

    // Delete from source bucket (original video file)
    const [sourceFiles] = await sourceBucket.getFiles({ prefix: sourcePrefix });

    const sourceDeletions = sourceFiles.map((file) =>
      file
        .delete()
        .catch((err) =>
          console.warn(
            `[GCS] Failed to delete source file ${file.name}:`,
            err.message
          )
        )
    );

    // Delete from public bucket (HLS segments, master.m3u8, etc.)
    const [publicFiles] = await publicBucket.getFiles({ prefix: publicPrefix });

    const publicDeletions = publicFiles.map((file) =>
      file
        .delete()
        .catch((err) =>
          console.warn(
            `[GCS] Failed to delete public file ${file.name}:`,
            err.message
          )
        )
    );

    // Execute all deletions in parallel
    await Promise.all([...sourceDeletions, ...publicDeletions]);

    console.log(
      `[GCS] Successfully deleted ${
        sourceFiles.length + publicFiles.length
      } files for assetId: ${assetId}`
    );
  } catch (error) {
    console.error(`[GCS] Error deleting video assets for ${assetId}:`, error);
    throw new Error(`Failed to delete video assets: ${error.message}`);
  }
}

/**
 * Delete all assets for an entire course
 * @param {string} adminId - Admin ID
 * @param {string} courseId - Course ID
 * @returns {Promise<void>}
 */
async function deleteCourseAssets(adminId, courseId) {
  const sourcePrefix = `uploads/${adminId}/${courseId}/`;
  const publicPrefix = `assets/${adminId}/${courseId}/`;

  try {
    console.log(
      `[GCS] Deleting all course assets for admin=${adminId} course=${courseId}`
    );

    // Delete from both buckets
    const [sourceFiles] = await sourceBucket.getFiles({ prefix: sourcePrefix });
    const [publicFiles] = await publicBucket.getFiles({ prefix: publicPrefix });

    const allDeletions = [
      ...sourceFiles.map((file) =>
        file
          .delete()
          .catch((err) =>
            console.warn(
              `[GCS] Failed to delete source file ${file.name}:`,
              err.message
            )
          )
      ),
      ...publicFiles.map((file) =>
        file
          .delete()
          .catch((err) =>
            console.warn(
              `[GCS] Failed to delete public file ${file.name}:`,
              err.message
            )
          )
      ),
    ];

    await Promise.all(allDeletions);

    console.log(
      `[GCS] Successfully deleted ${
        sourceFiles.length + publicFiles.length
      } files for courseId: ${courseId}`
    );
  } catch (error) {
    console.error(`[GCS] Error deleting course assets for ${courseId}:`, error);
    throw new Error(`Failed to delete course assets: ${error.message}`);
  }
}

module.exports = {
  deleteVideoAssets,
  deleteCourseAssets,
};
