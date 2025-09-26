const mongoose = require("mongoose");
const { Course } = require("../models/course");

// Migration script to fix thumbnail field inconsistencies
async function migrateThumbnailFields() {
  try {
    console.log("Starting thumbnail field migration...");

    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/course-selling-app"
    );
    console.log("Connected to MongoDB");

    // Find all courses with thumbnailUrl field
    const coursesWithThumbnailUrl = await Course.find({
      thumbnailUrl: { $exists: true },
    });
    console.log(
      `Found ${coursesWithThumbnailUrl.length} courses with thumbnailUrl field`
    );

    for (const course of coursesWithThumbnailUrl) {
      console.log(`Processing course: ${course.title}`);

      // If course has thumbnailUrl but no thumbnail object, migrate it
      if (course.thumbnailUrl && !course.thumbnail?.url) {
        course.thumbnail = {
          url: course.thumbnailUrl,
          public_id: null, // We don't have the public_id for old URLs
        };
        console.log(
          `Migrated thumbnailUrl to thumbnail object for: ${course.title}`
        );
      }

      // Remove the thumbnailUrl field
      course.thumbnailUrl = undefined;
      await course.save();
      console.log(`Removed thumbnailUrl field from: ${course.title}`);
    }

    // Remove thumbnailUrl field from all documents using MongoDB update
    const result = await Course.updateMany(
      { thumbnailUrl: { $exists: true } },
      { $unset: { thumbnailUrl: 1 } }
    );

    console.log(
      `Migration completed. Updated ${result.modifiedCount} documents.`
    );

    // Verify the migration
    const remainingThumbnailUrls = await Course.countDocuments({
      thumbnailUrl: { $exists: true },
    });
    console.log(
      `Remaining courses with thumbnailUrl field: ${remainingThumbnailUrls}`
    );

    if (remainingThumbnailUrls === 0) {
      console.log("✅ Migration successful - all thumbnailUrl fields removed");
    } else {
      console.log("⚠️ Migration incomplete - some thumbnailUrl fields remain");
    }
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateThumbnailFields();
}

module.exports = { migrateThumbnailFields };
