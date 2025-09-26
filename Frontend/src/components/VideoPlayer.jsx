import React, { useState, useRef, useEffect } from "react";
import Plyr from "plyr";
import Hls from "hls.js";
import { motion, AnimatePresence } from "framer-motion";
import Chatbot from "./Chatbot";
import "plyr/dist/plyr.css";

// Normalize GCS URL to bucket-domain (ensures CORS headers are present)
const toBucketDomain = (url) =>
  typeof url === "string"
    ? url.replace(
        /^https?:\/\/storage\.googleapis\.com\/([^/]+)\//,
        "https://$1.storage.googleapis.com/"
      )
    : url;

const VideoPlayer = ({
  video,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  onClose,
}) => {
  // Core state
  const videoRef = useRef(null);
  const plyrRef = useRef(null);
  const hlsRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Caption state
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [currentCaption, setCurrentCaption] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [transcriptData, setTranscriptData] = useState([]);
  const [showChatbot, setShowChatbot] = useState(false);
  // UI state
  const [showTranscript, setShowTranscript] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Available caption languages
  const CAPTION_LANGUAGES = {
    en: "English",
  };

  // Auto-detect video language
  const detectVideoLanguage = () => {
    if (!video || !availableLanguages.length) return "en";

    const videoTitle = video.title || "";
    const videoDescription = video.description || "";
    const combinedText = `${videoTitle} ${videoDescription}`.toLowerCase();

    const languagePatterns = {
      en: /english|mathematics|science|class|math|education|learning/,
    };

    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      if (availableLanguages.includes(lang) && pattern.test(combinedText)) {
        return lang;
      }
    }

    return availableLanguages.includes("hi")
      ? "hi"
      : availableLanguages[0] || "hi";
  };

  // Check available caption languages
  const checkAvailableLanguages = async () => {
    if (!video) return;

    const videoUrl = video.hlsUrl || video.playbackUrl || video.url;
    if (!videoUrl) {
      setError("Video URL not available");
      setLoading(false);
      return;
    }

    const baseUrl = videoUrl.replace("/master.m3u8", "");
    const languages = [];

    for (const [code] of Object.entries(CAPTION_LANGUAGES)) {
      try {
        const captionUrl = `${baseUrl}/captions_${code}.vtt`;
        const response = await fetch(toBucketDomain(captionUrl), {
          method: "HEAD",
        });

        if (response.ok) {
          languages.push(code);
        }
      } catch (error) {
        console.warn(`Caption check failed for ${code}:`, error);
      }
    }

    setAvailableLanguages(languages);

    if (languages.length > 0) {
      const detectedLang = detectVideoLanguage();
      const selectedLang = languages.includes(detectedLang)
        ? detectedLang
        : languages[0];
      setSelectedLanguage(selectedLang);
    }
  };

  // Load caption data
  const loadCaptionData = async () => {
    if (
      !video ||
      !selectedLanguage ||
      !availableLanguages.includes(selectedLanguage)
    ) {
      setTranscriptData([]);
      return;
    }

    try {
      const videoUrl = video.hlsUrl || video.playbackUrl || video.url;
      const baseUrl = videoUrl.replace("/master.m3u8", "");
      const captionUrl = `${baseUrl}/captions_${selectedLanguage}.vtt`;

      const response = await fetch(toBucketDomain(captionUrl));
      if (!response.ok) throw new Error("Failed to load captions");

      const vttContent = await response.text();
      const captions = parseVTT(vttContent);
      setTranscriptData(captions);
    } catch (error) {
      console.error("Error loading captions:", error);
      setTranscriptData([]);
    }
  };

  // Parse VTT content
  const parseVTT = (vttContent) => {
    const lines = vttContent.split("\n");
    const captions = [];
    let currentCaption = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.includes("-->")) {
        const [startTime, endTime] = line.split(" --> ");
        currentCaption.start = parseTimeToSeconds(startTime);
        currentCaption.end = parseTimeToSeconds(endTime);
      } else if (line && !line.startsWith("WEBVTT") && !line.match(/^\d+$/)) {
        if (currentCaption.start !== undefined) {
          currentCaption.text = line;
          captions.push({ ...currentCaption });
          currentCaption = {};
        }
      }
    }

    return captions;
  };

  // Parse time string to seconds
  const parseTimeToSeconds = (timeString) => {
    const parts = timeString.split(":");
    const seconds = parseFloat(parts[parts.length - 1]);
    const minutes = parseInt(parts[parts.length - 2]) || 0;
    const hours = parseInt(parts[parts.length - 3]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Update current caption based on video time
  useEffect(() => {
    if (!transcriptData.length || !captionsEnabled) {
      setCurrentCaption("");
      return;
    }

    const currentCue = transcriptData.find(
      (cue) => currentTime >= cue.start && currentTime <= cue.end
    );

    setCurrentCaption(currentCue ? currentCue.text : "");
  }, [currentTime, transcriptData, captionsEnabled]);

  // Initialize Plyr player
  const initializePlayer = () => {
    if (!videoRef.current || plyrRef.current) return;

    try {
      const plyr = new Plyr(videoRef.current, {
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "duration",
          "mute",
          "volume",
          "settings",
          "pip",
          "fullscreen",
        ],
        settings: ["quality", "speed"],
        quality: {
          default: 720,
          options: [1080, 720, 480, 360, 240],
          forced: true,
        },
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
        keyboard: { focused: true, global: false },
        tooltips: { controls: true, seek: true },
        ratio: "16:9",
        clickToPlay: true,
        hideControls: true,
        fullscreen: { enabled: true, fallback: true, iosNative: true },
        storage: { enabled: false },
      });

      plyrRef.current = plyr;

      // Event listeners
      plyr.on("ready", () => {
        setLoading(false);
      });

      plyr.on("timeupdate", () => {
        setCurrentTime(plyr.currentTime);
      });

      plyr.on("error", (event) => {
        console.error("Plyr error:", event);
        setError("Failed to load video player");
        setLoading(false);
      });
    } catch (error) {
      console.error("Failed to initialize Plyr:", error);
      setError("Failed to initialize video player");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (plyrRef.current) {
      console.log(" SETTING UP FULLSCREEN LISTENERS:", {
        plyrExists: !!plyrRef.current,
        plyrHasOn: !!plyrRef.current.on,
        plyrHasFullscreen: !!plyrRef.current.fullscreen,
      });

      const handleFullscreenChange = () => {
        // Check both Plyr fullscreen and browser fullscreen
        const plyrFullscreen = plyrRef.current?.fullscreen?.active || false;
        const browserFullscreen = !!(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        );

        const isFullscreenActive = plyrFullscreen || browserFullscreen;
        setIsFullscreen(isFullscreenActive);

        console.log(" FULLSCREEN CHANGE DETECTED:", {
          plyrFullscreen,
          browserFullscreen,
          isFullscreenActive,
        });
      };

      // Listen to both Plyr and browser fullscreen events
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.addEventListener("mozfullscreenchange", handleFullscreenChange);
      document.addEventListener("MSFullscreenChange", handleFullscreenChange);

      // Also listen to Plyr events
      if (plyrRef.current.on) {
        plyrRef.current.on("enterfullscreen", handleFullscreenChange);
        plyrRef.current.on("exitfullscreen", handleFullscreenChange);
        console.log(" PLYR EVENT LISTENERS ATTACHED");
      } else {
        console.log(" PLYR EVENT LISTENERS NOT AVAILABLE");
      }

      // Manual check every second as fallback
      const fallbackCheck = setInterval(() => {
        const browserFullscreen = !!(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        );

        if (browserFullscreen !== isFullscreen) {
          console.log(" FALLBACK FULLSCREEN DETECTION:", { browserFullscreen });
          setIsFullscreen(browserFullscreen);
        }
      }, 1000);

      return () => {
        document.removeEventListener(
          "fullscreenchange",
          handleFullscreenChange
        );
        document.removeEventListener(
          "webkitfullscreenchange",
          handleFullscreenChange
        );
        document.removeEventListener(
          "mozfullscreenchange",
          handleFullscreenChange
        );
        document.removeEventListener(
          "MSFullscreenChange",
          handleFullscreenChange
        );

        if (plyrRef.current && plyrRef.current.off) {
          plyrRef.current.off("enterfullscreen", handleFullscreenChange);
          plyrRef.current.off("exitfullscreen", handleFullscreenChange);
        }

        clearInterval(fallbackCheck);
      };
    }
  }, [plyrRef]);

  // Setup HLS
  const setupHLS = () => {
    if (!video) return;

    const videoUrl = video.hlsUrl || video.playbackUrl || video.url;
    if (!videoUrl) {
      setError("Video URL not available");
      setLoading(false);
      return;
    }

    const hlsUrl = toBucketDomain(videoUrl);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        initializePlayer();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS error:", data);
        if (data.fatal) {
          setError("Failed to load video");
          setLoading(false);
        }
      });
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = hlsUrl;
      initializePlayer();
    } else {
      setError("HLS not supported in this browser");
      setLoading(false);
    }
  };

  // Initialize video
  useEffect(() => {
    if (video) {
      checkAvailableLanguages();
      setupHLS();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (plyrRef.current) {
        plyrRef.current.destroy();
      }
    };
  }, [video?.id]);

  // Load captions when language changes
  useEffect(() => {
    if (selectedLanguage && availableLanguages.includes(selectedLanguage)) {
      loadCaptionData();
    }
  }, [selectedLanguage, availableLanguages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.target.tagName === "INPUT") return;

      switch (event.key.toLowerCase()) {
        case " ":
          event.preventDefault();
          if (plyrRef.current) {
            plyrRef.current.togglePlay();
          }
          break;
        case "f":
          if (plyrRef.current) {
            plyrRef.current.fullscreen.toggle();
          }
          break;
        case "m":
          if (plyrRef.current) {
            plyrRef.current.muted = !plyrRef.current.muted;
          }
          break;
        case "t":
          setShowTranscript(!showTranscript);
          break;
        case "c":
          setCaptionsEnabled(!captionsEnabled);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [showTranscript, captionsEnabled]);

  // Filter transcript based on search
  const filteredTranscript = transcriptData.filter((cue) =>
    cue.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Jump to specific time
  const jumpToTime = (time) => {
    if (plyrRef.current) {
      plyrRef.current.currentTime = time;
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-md">
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {}}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose || (() => window.history.back())}
            className="text-white hover:text-gray-300 text-2xl"
          >
            ×
          </button>
          <div>
            <h2 className="text-lg font-semibold">{video?.title}</h2>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          {availableLanguages.length > 1 && (
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-1 bg-gray-800 text-white rounded border border-gray-600"
            >
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {CAPTION_LANGUAGES[lang]}
                </option>
              ))}
            </select>
          )}

          {/* Caption Toggle */}
          <button
            onClick={() => setCaptionsEnabled(!captionsEnabled)}
            className={`px-3 py-1 rounded ${
              captionsEnabled
                ? "bg-blue-600 text-white"
                : "bg-gray-600 text-gray-300"
            }`}
          >
            {captionsEnabled ? "Hide" : "Show"} Captions
          </button>

          {/* Sidebar Toggle */}
          <button
            onClick={() => {
              if (!showTranscript && !showChatbot) {
                setShowTranscript(true);
              } else {
                setShowTranscript(false);
                setShowChatbot(false);
              }
            }}
            className={`px-3 py-1 rounded ${
              showTranscript || showChatbot
                ? "bg-blue-600 text-white"
                : "bg-gray-600 text-gray-300"
            }`}
          >
            {showTranscript || showChatbot ? "Hide" : "Show"} Sidebar
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Player */}
        <div
          className={`${
            showTranscript || showChatbot ? "flex-1" : "w-full"
          } relative bg-black`}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
              <div className="text-white text-lg">Loading video...</div>
            </div>
          )}

          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              className="w-full h-full"
              controls={false}
              playsInline
            />

            {/* Caption Overlay */}
            {(() => {
              const shouldShowCaption = captionsEnabled && currentCaption;

              if (
                !!(
                  document.fullscreenElement ||
                  document.webkitFullscreenElement ||
                  document.mozFullScreenElement ||
                  document.msFullscreenElement
                )
              ) {
                console.log(" FULLSCREEN DETECTED - Creating DOM captions");

                setTimeout(() => {
                  const existingCaptions = document.querySelectorAll(
                    ".direct-fullscreen-caption"
                  );
                  existingCaptions.forEach((el) => el.remove());

                  if (shouldShowCaption) {
                    const fullscreenElement =
                      document.fullscreenElement ||
                      document.webkitFullscreenElement ||
                      document.mozFullScreenElement ||
                      document.msFullscreenElement;

                    // Try multiple container strategies
                    const containers = [
                      fullscreenElement,
                      document.querySelector(".plyr"),
                      document.querySelector(".plyr__video-wrapper"),
                      document.querySelector("video"),
                      document.body,
                    ].filter(Boolean);

                    const targetContainer = containers[0];

                    console.log(" FULLSCREEN CONTAINER:", {
                      hasFullscreenElement: !!fullscreenElement,
                      targetTag: targetContainer.tagName,
                      targetClass: targetContainer.className,
                      containersFound: containers.length,
                    });

                    // Create caption element directly
                    const captionDiv = document.createElement("div");
                    captionDiv.className = "direct-fullscreen-caption";
                    captionDiv.style.cssText = `
                      position: fixed !important;
                      bottom: 80px !important;
                      left: 50% !important;
                      transform: translateX(-50%) !important;
                      z-index: 2147483647 !important;
                      background: rgba(0, 0, 0, 0.85) !important;
                      color: white !important;
                      padding: 14px 28px !important;
                      border-radius: 8px !important;
                      font-size: 24px !important;
font-weight: 500 !important;
                      text-align: center !important;
                      max-width: 80vw !important;
                      word-wrap: break-word !important;
                      line-height: 1.4 !important;
                      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8) !important;
                      border: 1px solid rgba(255, 255, 255, 0.15) !important;
                      box-shadow: 0 3px 15px rgba(0, 0, 0, 0.6) !important;
                      pointer-events: none !important;
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                    `;
                    captionDiv.textContent = currentCaption;

                    targetContainer.appendChild(captionDiv);

                    // Double-check visibility and try fallbacks
                    setTimeout(() => {
                      const isVisible =
                        captionDiv.offsetWidth > 0 &&
                        captionDiv.offsetHeight > 0;
                      console.log(" CAPTION CREATED:", {
                        parent: captionDiv.parentElement?.tagName,
                        text: captionDiv.textContent.substring(0, 30) + "...",
                        visible: isVisible,
                      });

                      // If not visible, try document.body as fallback
                      if (!isVisible && targetContainer !== document.body) {
                        console.log(" FALLBACK: Moving to document.body");
                        document.body.appendChild(captionDiv);
                      }
                    }, 100);
                  }
                }, 50);
              } else {
                // Clean up direct DOM captions when not in fullscreen
                setTimeout(() => {
                  const existingCaptions = document.querySelectorAll(
                    ".direct-fullscreen-caption"
                  );
                  if (existingCaptions.length > 0) {
                    console.log(
                      "🧹 CLEANING UP FULLSCREEN CAPTIONS:",
                      existingCaptions.length
                    );
                    existingCaptions.forEach((el) => el.remove());
                  }
                }, 50);
              }

              return shouldShowCaption ? (
                isFullscreen ? (
                  <></>
                ) : (
                  <div className="caption-overlay absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30 max-w-4xl px-4">
                    <div className="bg-black bg-opacity-90 text-white px-6 py-3 rounded-lg text-center shadow-lg text-lg font-medium leading-relaxed">
                      {currentCaption}
                    </div>
                  </div>
                )
              ) : null;
            })()}

            {/* Navigation Controls */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between z-20">
              {hasPrevious && (
                <button
                  onClick={onPrevious}
                  className="px-4 py-2 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-70"
                >
                  ← Previous
                </button>
              )}
              {hasNext && (
                <button
                  onClick={onNext}
                  className="px-4 py-2 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-70 ml-auto"
                >
                  Next →
                </button>
              )}
              {/* Move sidebar outside the navigation controls container */}
              <AnimatePresence>
                {(showTranscript || showChatbot) && (
                  <motion.div
                    initial={{ x: 400, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 400, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed right-0 top-16 bottom-0 w-96 max-h-[calc(100vh-4rem)] bg-gray-900 text-white overflow-hidden flex flex-col shadow-2xl border-l border-gray-700 z-40"
                  >
                    {/* Tab Headers */}
                    <div className="flex border-b border-gray-700">
                      <button
                        onClick={() => {
                          setShowTranscript(true);
                          setShowChatbot(false);
                        }}
                        className={`flex-1 px-4 py-3 text-sm font-medium ${
                          showTranscript && !showChatbot
                            ? "bg-blue-600 text-white"
                            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        📝 Transcript
                      </button>
                      <button
                        onClick={() => {
                          setShowTranscript(false);
                          setShowChatbot(true);
                        }}
                        className={`flex-1 px-4 py-3 text-sm font-medium ${
                          showChatbot && !showTranscript
                            ? "bg-green-600 text-white"
                            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        🤖 Sahayak
                      </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-hidden">
                      {showTranscript && !showChatbot && (
                        <div className="h-full flex flex-col p-4">
                          <h3 className="text-lg font-semibold mb-4 flex-shrink-0">
                            Transcript
                          </h3>

                          {/* Search */}
                          <div className="mb-4 flex-shrink-0">
                            <input
                              type="text"
                              placeholder="Search transcript..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
                            />
                          </div>

                          {/* Transcript Content */}
                          <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-2">
                            {filteredTranscript.map((cue, index) => (
                              <div
                                key={index}
                                onClick={() => jumpToTime(cue.start)}
                                className={`p-3 rounded cursor-pointer transition-colors ${
                                  currentTime >= cue.start &&
                                  currentTime <= cue.end
                                    ? "bg-blue-600"
                                    : "bg-gray-800 hover:bg-gray-700"
                                }`}
                              >
                                <div className="text-xs text-gray-400 mb-1">
                                  {Math.floor(cue.start / 60)}:
                                  {Math.floor(cue.start % 60)
                                    .toString()
                                    .padStart(2, "0")}
                                </div>
                                <div className="text-sm">{cue.text}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {showChatbot && !showTranscript && (
                        <div className="h-full">
                          <Chatbot
                            video={video}
                            transcriptData={transcriptData}
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
