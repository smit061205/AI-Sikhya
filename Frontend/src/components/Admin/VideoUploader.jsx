import React, { useState } from "react";
import adminApi from "../../api/adminApi";
import axios from "axios";

const VideoUploader = ({ courseId, onUploadComplete, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setUploadProgress(0);
    setError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // 1. Get the signed URL from the backend
      const response = await adminApi.post(
        `/admin/courses/${courseId}/videos/generate-upload-url`,
        {
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        }
      );

      const { signedUrl, videoId } = response.data;

      // 2. Upload the file directly to GCS using the signed URL
      const uploadClient = axios.create();
      // Ensure no Authorization header is sent to GCS (would break CORS/signature)
      delete uploadClient.defaults.headers.common["Authorization"];

      await uploadClient.put(signedUrl, selectedFile, {
        headers: {
          "Content-Type": selectedFile.type,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) /
              (progressEvent.total || progressEvent.loaded)
          );
          setUploadProgress(percentCompleted);
        },
      });

      // 3. Notify backend to mark the upload as complete
      await adminApi.post(
        `/admin/courses/${courseId}/videos/${videoId}/complete`
      );

      // Reset state and inform parent
      setSelectedFile(null);
      setUploadProgress(0);
      if (onUploadComplete) onUploadComplete();
      else if (onUploadSuccess)
        onUploadSuccess({ _id: videoId, title: selectedFile.name });
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 my-6 bg-black border border-gray-700 rounded-2xl">
      <h3 className="text-xl font-semibold mb-4 text-white">
        Add New Video Lecture
      </h3>
      {error && (
        <p className="text-red-400 bg-red-900/30 border border-red-700 p-2 rounded-md mb-4">
          {error}
        </p>
      )}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="videoFile"
            className="block text-sm font-medium text-gray-400"
          >
            Video File
          </label>
          <input
            type="file"
            id="videoFile"
            onChange={handleFileChange}
            accept="video/*"
            className="mt-1 block w-full text-sm text-gray-300 file:mr-4 file:py-2.5 file:px-4 file:rounded-2xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-br file:from-cyan-200 file:to-cyan-300 file:text-black hover:file:opacity-90 disabled:opacity-50"
            disabled={isUploading}
          />
        </div>
        {isUploading && (
          <div className="w-full bg-gray-800 rounded-full h-4 relative overflow-hidden">
            <div
              className="bg-cyan-500 h-4 rounded-full transition-all duration-300 ease-linear"
              style={{ width: `${uploadProgress}%` }}
            ></div>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
              {uploadProgress}%
            </span>
          </div>
        )}
        <button
          onClick={handleUpload}
          disabled={isUploading || !selectedFile}
          className="w-full inline-flex justify-center py-2.5 px-4 text-sm font-semibold rounded-2xl text-black bg-gradient-to-br from-cyan-200 to-cyan-300 hover:opacity-90 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isUploading ? `Uploading... ${uploadProgress}%` : "Upload Video"}
        </button>
      </div>
    </div>
  );
};

export default VideoUploader;
