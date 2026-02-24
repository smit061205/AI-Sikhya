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
        "https://$1.storage.googleapis.com/",
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
      (cue) => currentTime >= cue.start && currentTime <= cue.end,
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
        // Always start from the beginning
        plyr.currentTime = 0;
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
        handleFullscreenChange,
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
          handleFullscreenChange,
        );
        document.removeEventListener(
          "webkitfullscreenchange",
          handleFullscreenChange,
        );
        document.removeEventListener(
          "mozfullscreenchange",
          handleFullscreenChange,
        );
        document.removeEventListener(
          "MSFullscreenChange",
          handleFullscreenChange,
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
        startPosition: 0, // always start from 0
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
    cue.text.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Jump to specific time
  const jumpToTime = (time) => {
    if (plyrRef.current) {
      plyrRef.current.currentTime = time;
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-[#0c0e14] flex items-center justify-center z-50">
        <div className="bg-[#111318] border border-[#222530] p-8 rounded-2xl max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-white mb-2">Video Error</h3>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={onClose}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const sidebarOpen = showTranscript || showChatbot;

  return (
    <div className="fixed inset-0 bg-[#0c0e14] z-50 flex flex-col font-poppins">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#111318] border-b border-[#222530] flex-shrink-0">
        {/* Left: close + title */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onClose || (() => window.history.back())}
            className="w-8 h-8 rounded-lg bg-[#1a1d27] border border-[#222530] flex items-center justify-center text-gray-400 hover:text-white hover:border-[#3a3d4a] transition-colors flex-shrink-0"
            title="Close (Esc)"
          >
            ✕
          </button>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">
              {video?.title}
            </p>
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Language selector */}
          {availableLanguages.length > 1 && (
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-[#1a1d27] border border-[#222530] text-white text-xs px-2 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500"
            >
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {CAPTION_LANGUAGES[lang]}
                </option>
              ))}
            </select>
          )}

          {/* Caption toggle */}
          <button
            onClick={() => setCaptionsEnabled(!captionsEnabled)}
            title="Toggle Captions (C)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              captionsEnabled
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400"
                : "bg-[#1a1d27] border-[#222530] text-gray-500 hover:text-gray-300"
            }`}
          >
            CC
          </button>

          {/* Sidebar toggle */}
          <button
            onClick={() => {
              if (!sidebarOpen) {
                setShowTranscript(true);
              } else {
                setShowTranscript(false);
                setShowChatbot(false);
              }
            }}
            title="Toggle Sidebar (T)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              sidebarOpen
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400"
                : "bg-[#1a1d27] border-[#222530] text-gray-500 hover:text-gray-300"
            }`}
          >
            ☰ Sidebar
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex min-h-0">
        {/* Video area */}
        <div className="flex-1 relative bg-black flex items-center justify-center h-full">
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10 gap-3">
              <div className="w-10 h-10 border-2 border-[#222530] border-t-cyan-500 rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Loading video…</p>
            </div>
          )}

          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              className="w-full h-full"
              controls={false}
              playsInline
            />

            {/* Caption overlay (non-fullscreen) */}
            {(() => {
              const shouldShowCaption = captionsEnabled && currentCaption;
              const inFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
              );

              if (inFullscreen) {
                setTimeout(() => {
                  document
                    .querySelectorAll(".direct-fullscreen-caption")
                    .forEach((el) => el.remove());
                  if (shouldShowCaption) {
                    const container =
                      document.fullscreenElement ||
                      document.webkitFullscreenElement ||
                      document.mozFullScreenElement ||
                      document.msFullscreenElement ||
                      document.body;
                    const div = document.createElement("div");
                    div.className = "direct-fullscreen-caption";
                    div.style.cssText = `position:fixed!important;bottom:80px!important;left:50%!important;transform:translateX(-50%)!important;z-index:2147483647!important;background:rgba(0,0,0,0.85)!important;color:white!important;padding:12px 24px!important;border-radius:8px!important;font-size:22px!important;font-weight:500!important;text-align:center!important;max-width:80vw!important;line-height:1.4!important;pointer-events:none!important;border:1px solid rgba(255,255,255,0.12)!important;`;
                    div.textContent = currentCaption;
                    container.appendChild(div);
                  }
                }, 50);
                return null;
              } else {
                setTimeout(() => {
                  document
                    .querySelectorAll(".direct-fullscreen-caption")
                    .forEach((el) => el.remove());
                }, 50);
              }

              return shouldShowCaption ? (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 max-w-4xl px-4 pointer-events-none">
                  <div className="bg-black/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl text-center text-base font-medium leading-relaxed border border-white/10 shadow-2xl">
                    {currentCaption}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Prev / Next nav */}
            <div className="absolute bottom-5 left-5 right-5 flex justify-between z-20 pointer-events-none">
              {hasPrevious && (
                <motion.button
                  onClick={onPrevious}
                  whileTap={{ scale: 0.95 }}
                  className="pointer-events-auto flex items-center gap-2 bg-black/60 backdrop-blur-sm border border-white/10 text-white text-sm px-4 py-2 rounded-xl hover:bg-black/80 transition-colors"
                >
                  ← Previous
                </motion.button>
              )}
              {hasNext && (
                <motion.button
                  onClick={onNext}
                  whileTap={{ scale: 0.95 }}
                  className="pointer-events-auto ml-auto flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  Next →
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-96 flex-shrink-0 bg-[#111318] border-l border-[#222530] flex flex-col overflow-hidden"
            >
              {/* Sidebar tabs */}
              <div className="flex border-b border-[#222530] flex-shrink-0">
                <button
                  onClick={() => {
                    setShowTranscript(true);
                    setShowChatbot(false);
                  }}
                  className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    showTranscript && !showChatbot
                      ? "text-cyan-400 border-b-2 border-cyan-500"
                      : "text-gray-600 hover:text-gray-300"
                  }`}
                >
                  📝 Transcript
                </button>
                <button
                  onClick={() => {
                    setShowTranscript(false);
                    setShowChatbot(true);
                  }}
                  className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    showChatbot && !showTranscript
                      ? "text-cyan-400 border-b-2 border-cyan-500"
                      : "text-gray-600 hover:text-gray-300"
                  }`}
                >
                  🤖 Sahayak AI
                </button>
              </div>

              {/* Sidebar content */}
              <div className="flex-1 overflow-hidden">
                {showTranscript && !showChatbot && (
                  <div className="h-full flex flex-col p-4">
                    {/* Search */}
                    <div className="relative mb-4 flex-shrink-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">
                        🔍
                      </span>
                      <input
                        type="text"
                        placeholder="Search transcript…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-[#0c0e14] border border-[#222530] text-white text-sm rounded-lg focus:outline-none focus:border-cyan-500 placeholder-gray-700"
                      />
                    </div>

                    {/* Transcript list */}
                    <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-1">
                      {filteredTranscript.length === 0 ? (
                        <p className="text-gray-700 text-sm text-center pt-8">
                          No captions available
                        </p>
                      ) : (
                        filteredTranscript.map((cue, index) => {
                          const active =
                            currentTime >= cue.start && currentTime <= cue.end;
                          const mins = Math.floor(cue.start / 60);
                          const secs = Math.floor(cue.start % 60)
                            .toString()
                            .padStart(2, "0");
                          return (
                            <div
                              key={index}
                              onClick={() => jumpToTime(cue.start)}
                              className={`p-3 rounded-lg cursor-pointer transition-all border ${
                                active
                                  ? "bg-cyan-500/10 border-cyan-500/30 text-white"
                                  : "bg-[#0c0e14] border-[#222530] text-gray-400 hover:border-[#3a3d4a] hover:text-white"
                              }`}
                            >
                              <span
                                className={`text-xs font-mono mr-2 ${active ? "text-cyan-400" : "text-gray-700"}`}
                              >
                                {mins}:{secs}
                              </span>
                              <span className="text-sm">{cue.text}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {showChatbot && !showTranscript && (
                  <div className="h-full">
                    <Chatbot video={video} transcriptData={transcriptData} />
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VideoPlayer;
