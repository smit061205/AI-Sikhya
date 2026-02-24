const mongoose = require("mongoose");
require("dotenv").config();

async function fixIndex() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ Connected to MongoDB");

    // Get the courses collection
    const coursesCollection = mongoose.connection.db.collection("courses");

    // List all indexes to see what exists
    const indexes = await coursesCollection.indexes();
    console.log(
      "📋 Current indexes:",
      indexes.map((idx) => idx.name)
    );

    // Try to drop the problematic index
    try {
      await coursesCollection.dropIndex("videoLectures.assetId_1");
      console.log('✅ Index "videoLectures.assetId_1" dropped successfully');
    } catch (error) {
      if (error.message.includes("index not found")) {
        console.log(
          'ℹ️  Index "videoLectures.assetId_1" not found (might already be dropped)'
        );
      } else {
        console.error("❌ Error dropping index:", error.message);
      }
    }

    console.log(
      "✅ Fix completed. Restart your server to recreate the index with sparse: true"
    );
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

fixIndex();
