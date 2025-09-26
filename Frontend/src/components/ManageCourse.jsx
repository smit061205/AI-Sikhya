import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import adminApi from "../api/adminApi"; // Use the dedicated adminApi instead of axios
import { useAdminAuth } from "../context/AdminAuthContext";
import VideoUploader from "./Admin/VideoUploader"; // Import the uploader
import NavbarAdmin from "./NavbarAdmin";
import Footer from "./Footer";
import Plyr from "plyr";
import Hls from "hls.js";
import "plyr/dist/plyr.css";
import Lenis from "lenis";

// Normalize GCS URL to bucket-domain (ensures CORS headers are present)
const toBucketDomain = (url) =>
  typeof url === "string"
    ? url.replace(
        /^https?:\/\/storage\.googleapis\.com\/([^/]+)\//,
        "https://$1.storage.googleapis.com/"
      )
    : url;

// Local player component that wires HLS into Plyr
const PlyrPlayer = ({ src, poster, captionTrackUrl }) => {
  const videoRef = useRef(null);
  const plyrRef = useRef(null);
  const hlsRef = useRef(null);
  const trackRef = useRef(null);
  const [err, setErr] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcriptData, setTranscriptData] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Parse VTT content into transcript data
  const parseVTT = (vttContent) => {
    const lines = vttContent.split("\n");
    const cues = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Look for timestamp lines (contains -->)
      if (line.includes("-->")) {
        const [startTimeStr, endTimeStr] = line
          .split("-->")
          .map((t) => t.trim());
        const textLines = [];
        i++;

        // Collect text lines until empty line or end
        while (i < lines.length && lines[i].trim() !== "") {
          textLines.push(lines[i].trim());
          i++;
        }

        if (textLines.length > 0) {
          const startTime = parseTimeToSeconds(startTimeStr);
          const endTime = parseTimeToSeconds(endTimeStr);

          console.log("[VTT] Parsing cue:", {
            startTimeStr,
            endTimeStr,
            startTime,
            endTime,
            text: textLines.join(" "),
          });

          // Validate timestamps are finite and endTime > startTime
          if (isFinite(startTime) && isFinite(endTime) && endTime > startTime) {
            cues.push({
              startTime: startTime,
              endTime: endTime,
              text: textLines.join(" "),
            });
          } else {
            console.warn("[VTT] Invalid timestamps:", {
              startTimeStr,
              endTimeStr,
              startTime,
              endTime,
              text: textLines.join(" "),
            });
          }
        }
      }
      i++;
    }

    return cues;
  };

  // Convert VTT timestamp to seconds
  const parseTimeToSeconds = (timeStr) => {
    try {
      const parts = timeStr.split(":");
      if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        const result =
          parseInt(hours, 10) * 3600 +
          parseInt(minutes, 10) * 60 +
          parseFloat(seconds);
        // Validate result is a finite number
        return isFinite(result) ? result : 0;
      }
      return 0;
    } catch (e) {
      console.warn("[VTT] Failed to parse timestamp:", timeStr, e);
      return 0;
    }
  };

  // Format seconds back to readable time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Seek to specific time in video
  const seekToTime = (time) => {
    const player = plyrRef.current;
    if (player) {
      player.currentTime = time;
      if (player.paused) {
        player.play();
      }
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    console.log("[PLYR] init with src:", src);

    // Wait for video element to be ready in DOM
    const initializePlayer = () => {
      // Remove conflicting attributes that might interfere with Plyr
      video.removeAttribute("controls");
      video.removeAttribute("autoplay");

      // Initialize HLS first. We'll create Plyr after manifest is parsed so
      // the quality menu can be populated like the demo.
      initializeHLS();
    };
    const tryAutoplay = (player) => {
      try {
        video.muted = true;
        player.muted = true;
        const p = video.play();
        if (p && typeof p.catch === "function") {
          p.catch((err) => console.warn("[VIDEO] autoplay blocked:", err));
        }
      } catch (e) {
        console.warn("[VIDEO] play() error:", e);
      }
    };

    const initializeHLS = () => {
      console.log("[PLYR] Hls.isSupported():", Hls.isSupported());
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          debug: false,
        });
        hlsRef.current = hls;
        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log("[HLS] MEDIA_ATTACHED");
          hls.loadSource(src);
        });
        hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
          console.log("[HLS] MANIFEST_PARSED", {
            levels: hls.levels?.map((l) => l.height),
            data,
          });

          // Build Plyr with a proper quality menu like the demo
          const availableHeights = Array.from(
            new Set(hls.levels.map((l) => l.height))
          ).sort((a, b) => b - a); // e.g., [1080, 720, 480]

          const player = new Plyr(video, {
            controls: [
              "play",
              "progress",
              "current-time",
              "mute",
              "volume",
              "settings",
              "pip",
              "airplay",
              "fullscreen",
            ],
            settings: ["captions", "quality", "speed"],
            captions: { active: true, language: "en", update: true },
            speed: {
              selected: 1,
              options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
            },
            ratio: "16:9",
            clickToPlay: true,
            autoplay: false,
            i18n: {
              qualityLabel: { 0: "Auto" },
            },
            quality: {
              default: 0, // 0 = Auto in our labeling
              options: [0, ...availableHeights],
              forced: true,
              onChange: (q) => {
                const newQ = Number(q);
                if (!hlsRef.current) return;
                if (newQ === 0) {
                  hlsRef.current.currentLevel = -1; // Auto
                  console.log("[HLS] Set to auto quality");
                } else {
                  const idx = hlsRef.current.levels.findIndex(
                    (lvl) => lvl.height === newQ
                  );
                  if (idx !== -1) {
                    hlsRef.current.currentLevel = idx;
                    console.log(
                      "[HLS] Switched to level:",
                      idx,
                      hlsRef.current.levels[idx]
                    );
                  }
                }
              },
            },
          });

          plyrRef.current = player;

          // Enable verbose caption debugging between here and ready handler
          if (true) {
            // Debug: Plyr captions-related events
            try {
              player.on("languagechange", () =>
                console.log("[PLYR] languagechange", {
                  language: player?.language,
                })
              );
            } catch {}
          }

          player.on("ready", () => {
            console.log("[PLYR] ready");
            // Ensure captions are visible by default
            try {
              const tracks = video.textTracks;
              for (let i = 0; i < tracks.length; i++) {
                tracks[i].mode = "showing";
              }
              player.toggleCaptions(true);
              try {
                player.language = "en";
              } catch {}
              try {
                if (player.captions) player.captions.active = true;
                if (typeof player.currentTrack === "number")
                  player.currentTrack = 0;
              } catch {}
              // Also bind to the <track> element load event for reliability
              const trackEl = video.querySelector("track");
              if (trackEl && trackEl.track) {
                const onTrackLoad = () => {
                  try {
                    const cuesArr = trackEl.track.cues
                      ? Array.from(trackEl.track.cues)
                      : [];
                    const firstStart = cuesArr.length
                      ? Number(cuesArr[0].startTime?.toFixed?.(3) ?? 0)
                      : null;
                    const lastEnd = cuesArr.length
                      ? Number(
                          cuesArr[cuesArr.length - 1].endTime?.toFixed?.(3) ?? 0
                        )
                      : null;
                    console.log(
                      "[CAPTIONS] Track loaded, cues:",
                      trackEl.track.cues?.length ?? 0
                    );
                    console.log(
                      "[CAPTIONS] HTMLTrackElement.readyState:",
                      trackEl.readyState
                    );
                    console.log("[CAPTIONS] cue range:", {
                      firstStart,
                      lastEnd,
                      videoDuration: Number(video.duration?.toFixed?.(2) || 0),
                    });
                    // Nudge rendering in some browsers
                    try {
                      const t = trackEl.track;
                      const prev = t.mode;
                      t.mode = "hidden";
                      t.mode = prev || "showing";
                    } catch {}
                    // Force-select/activate captions in Plyr as well
                    try {
                      if (player.captions) player.captions.active = true;
                      if (typeof player.currentTrack === "number")
                        player.currentTrack = 0;
                      player.toggleCaptions(true);
                    } catch {}
                  } catch {}
                };
                const onTrackError = (e) => {
                  console.error("[CAPTIONS] Track error event", e);
                  try {
                    console.log(
                      "[CAPTIONS] HTMLTrackElement.readyState (on error):",
                      trackEl.readyState
                    );
                  } catch {}
                };
                trackEl.addEventListener("load", onTrackLoad, { once: true });
                trackEl.addEventListener("error", onTrackError);
                // If already loaded, force showing
                try {
                  trackEl.track.mode = "showing";
                } catch {}
              }
              console.log(
                "[CAPTIONS] textTracks:",
                Array.from(video.textTracks || []).map((t) => ({
                  kind: t.kind,
                  label: t.label,
                  lang: t.language,
                  mode: t.mode,
                  cues: t.cues?.length ?? 0,
                }))
              );
            } catch {}

            // Debug: overlay computed styles and geometry on ready
            try {
              const captionsEl =
                player?.elements?.container?.querySelector(".plyr__captions");
              if (captionsEl) {
                const cs = window.getComputedStyle(captionsEl);
                const r = captionsEl.getBoundingClientRect();
                console.log("[CAPTIONS] overlay computed on ready", {
                  display: cs.display,
                  visibility: cs.visibility,
                  opacity: cs.opacity,
                  zIndex: cs.zIndex,
                  rect: {
                    x: Math.round(r.x),
                    y: Math.round(r.y),
                    w: Math.round(r.width),
                    h: Math.round(r.height),
                  },
                });
              }
            } catch {}

            // Try autoplay (muted). If the browser blocks, a manual click will play.
            tryAutoplay(player);

            // Force caption initialization after player is ready
            if (captionTrackUrl) {
              setTimeout(async () => {
                try {
                  // Manually load VTT content to bypass Plyr's blob URL conversion
                  const vttUrl = toBucketDomain(captionTrackUrl);
                  console.log("[CAPTIONS] Loading VTT manually from:", vttUrl);

                  const response = await fetch(vttUrl);
                  if (!response.ok) {
                    throw new Error(`Failed to fetch VTT: ${response.status}`);
                  }

                  const vttContent = await response.text();
                  console.log(
                    "[CAPTIONS] VTT content loaded, length:",
                    vttContent.length
                  );

                  // Parse VTT and inject cues directly
                  const cues = parseVTT(vttContent);
                  console.log("[CAPTIONS] Parsed cues:", cues.length);

                  // Get the text track (should exist from <track> element)
                  const tracks = video.textTracks;
                  if (tracks.length > 0) {
                    const track = tracks[0];

                    // Clear existing cues
                    while (track.cues && track.cues.length > 0) {
                      track.removeCue(track.cues[0]);
                    }

                    // Add parsed cues
                    cues.forEach((cue) => {
                      try {
                        const vttCue = new VTTCue(
                          cue.startTime,
                          cue.endTime,
                          cue.text
                        );
                        console.log("[CAPTIONS] Adding cue:", vttCue);
                        track.addCue(vttCue);
                      } catch (e) {
                        console.warn("[CAPTIONS] Failed to add cue:", e, cue);
                      }
                    });

                    // Activate the track
                    track.mode = "showing";
                    console.log(
                      "[CAPTIONS] Track activated with",
                      track.cues.length,
                      "cues"
                    );
                  }

                  // Also try Plyr's caption methods
                  player.toggleCaptions(true);
                  if (player.captions) player.captions.active = true;
                  if (typeof player.currentTrack === "number")
                    player.currentTrack = 0;

                  console.log("[CAPTIONS] Manual caption loading completed");
                } catch (e) {
                  console.warn(
                    "[CAPTIONS] Failed to load captions manually:",
                    e
                  );

                  // Fallback to original method
                  try {
                    const tracks = video.textTracks;
                    for (let i = 0; i < tracks.length; i++) {
                      tracks[i].mode = "showing";
                    }
                    player.toggleCaptions(true);
                    if (player.captions) player.captions.active = true;
                    console.log("[CAPTIONS] Fallback activation attempted");
                  } catch (fallbackError) {
                    console.warn(
                      "[CAPTIONS] Fallback also failed:",
                      fallbackError
                    );
                  }
                }
              }, 500);
            }
          });

          // HLS event handlers
          hls.on(Hls.Events.LEVEL_LOADED, (_e, data) => {
            console.log("[HLS] LEVEL_LOADED", {
              duration: data?.details?.totalduration,
              live: data?.details?.live,
            });
          });
          hls.on(Hls.Events.FRAG_LOADED, (_e, data) => {
            console.log("[HLS] FRAG_LOADED", data?.frag?.relurl);
          });
          hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
            const level = hls.levels?.[data.level];
            const detail = {
              index: data.level,
              height: level?.height ?? null,
              bitrate: level?.bitrate ?? null,
            };
            console.log("[HLS] LEVEL_SWITCHED ->", detail);
            try {
              video.dispatchEvent(
                new CustomEvent("hls-quality-changed", { detail })
              );
            } catch {}
          });
          hls.on(Hls.Events.ERROR, (_event, data) => {
            const info = `${data?.type ?? ""}:${data?.details ?? ""}`;
            if (data?.fatal) {
              console.error("[HLS FATAL]", info, data);
              if (videoRef.current) setErr(info || "Fatal HLS error");
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.warn("[HLS] fatal NETWORK_ERROR → startLoad()");
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.warn("[HLS] fatal MEDIA_ERROR → recoverMediaError()");
                  hls.recoverMediaError();
                  break;
                default:
                  console.warn("[HLS] fatal error → destroy()");
                  try {
                    hls.destroy();
                  } catch {}
                  break;
              }
            } else {
              // Non-fatal (e.g., bufferStalledError) - log only to avoid noisy UI
              console.warn("[HLS NON-FATAL]", info);
            }
          });
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari - native HLS (no manual quality switching)
        video.src = src;
        const player = new Plyr(video, {
          controls: [
            "play",
            "progress",
            "current-time",
            "mute",
            "volume",
            "settings",
            "pip",
            "airplay",
            "fullscreen",
          ],
          settings: ["captions", "speed"],
          captions: { active: true, language: "en", update: true },
          speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
          ratio: "16:9",
          clickToPlay: true,
          autoplay: false,
        });

        plyrRef.current = player;

        // Enable verbose caption debugging between here and ready handler
        if (true) {
          // Debug: Plyr captions-related events
          try {
            player.on("languagechange", () =>
              console.log("[PLYR][Safari] languagechange", {
                language: player?.language,
              })
            );
          } catch {}
        }

        player.on("ready", () => {
          console.log("[PLYR][Safari] ready");
          // Ensure captions are visible by default
          try {
            const tracks = video.textTracks;
            for (let i = 0; i < tracks.length; i++) {
              tracks[i].mode = "showing";
            }
            player.toggleCaptions(true);
            try {
              player.language = "en";
            } catch {}
            try {
              if (player.captions) player.captions.active = true;
              if (typeof player.currentTrack === "number")
                player.currentTrack = 0;
            } catch {}
            // Also bind to the <track> element load event for reliability
            const trackEl = video.querySelector("track");
            if (trackEl && trackEl.track) {
              const onTrackLoad = () => {
                try {
                  const cuesArr = trackEl.track.cues
                    ? Array.from(trackEl.track.cues)
                    : [];
                  const firstStart = cuesArr.length
                    ? Number(cuesArr[0].startTime?.toFixed?.(3) ?? 0)
                    : null;
                  const lastEnd = cuesArr.length
                    ? Number(
                        cuesArr[cuesArr.length - 1].endTime?.toFixed?.(3) ?? 0
                      )
                    : null;
                  console.log(
                    "[CAPTIONS][Safari] Track loaded, cues:",
                    trackEl.track.cues?.length ?? 0
                  );
                  console.log(
                    "[CAPTIONS][Safari] HTMLTrackElement.readyState:",
                    trackEl.readyState
                  );
                  console.log("[CAPTIONS][Safari] cue range:", {
                    firstStart,
                    lastEnd,
                    videoDuration: Number(video.duration?.toFixed?.(2) || 0),
                  });
                  // Nudge rendering in some browsers
                  try {
                    const t = trackEl.track;
                    const prev = t.mode;
                    t.mode = "hidden";
                    t.mode = prev || "showing";
                  } catch {}
                  // Force-select/activate captions in Plyr as well
                  try {
                    if (player.captions) player.captions.active = true;
                    if (typeof player.currentTrack === "number")
                      player.currentTrack = 0;
                    player.toggleCaptions(true);
                  } catch {}
                } catch {}
              };
              const onTrackError = (e) => {
                console.error("[CAPTIONS][Safari] Track error event", e);
                try {
                  console.log(
                    "[CAPTIONS][Safari] HTMLTrackElement.readyState (on error):",
                    trackEl.readyState
                  );
                } catch {}
              };
              trackEl.addEventListener("load", onTrackLoad, { once: true });
              trackEl.addEventListener("error", onTrackError);
              // If already loaded, force showing
              try {
                trackEl.track.mode = "showing";
              } catch {}
            }
            console.log(
              "[CAPTIONS][Safari] textTracks:",
              Array.from(video.textTracks || []).map((t) => ({
                kind: t.kind,
                label: t.label,
                lang: t.language,
                mode: t.mode,
                cues: t.cues?.length ?? 0,
              }))
            );
          } catch {}

          // Debug: overlay computed styles and geometry on ready (Safari)
          try {
            const captionsEl =
              player?.elements?.container?.querySelector(".plyr__captions");
            if (captionsEl) {
              const cs = window.getComputedStyle(captionsEl);
              const r = captionsEl.getBoundingClientRect();
              console.log("[CAPTIONS][Safari] overlay computed on ready", {
                display: cs.display,
                visibility: cs.visibility,
                opacity: cs.opacity,
                zIndex: cs.zIndex,
                rect: {
                  x: Math.round(r.x),
                  y: Math.round(r.y),
                  w: Math.round(r.width),
                  h: Math.round(r.height),
                },
              });
            }
          } catch {}

          // Try autoplay (muted). If the browser blocks, a manual click will play.
          tryAutoplay(player);

          // Force caption initialization after player is ready (Safari)
          if (captionTrackUrl) {
            setTimeout(async () => {
              try {
                // Manually load VTT content to bypass Plyr's blob URL conversion
                const vttUrl = toBucketDomain(captionTrackUrl);
                console.log("[CAPTIONS] Loading VTT manually from:", vttUrl);

                const response = await fetch(vttUrl);
                if (!response.ok) {
                  throw new Error(`Failed to fetch VTT: ${response.status}`);
                }

                const vttContent = await response.text();
                console.log(
                  "[CAPTIONS] VTT content loaded, length:",
                  vttContent.length
                );

                // Parse VTT and inject cues directly
                const cues = parseVTT(vttContent);
                console.log("[CAPTIONS] Parsed cues:", cues.length);

                // Get the text track (should exist from <track> element)
                const tracks = video.textTracks;
                if (tracks.length > 0) {
                  const track = tracks[0];

                  // Clear existing cues
                  while (track.cues && track.cues.length > 0) {
                    track.removeCue(track.cues[0]);
                  }

                  // Add parsed cues
                  cues.forEach((cue) => {
                    try {
                      const vttCue = new VTTCue(
                        cue.startTime,
                        cue.endTime,
                        cue.text
                      );
                      console.log("[CAPTIONS] Adding cue:", vttCue);
                      track.addCue(vttCue);
                    } catch (e) {
                      console.warn("[CAPTIONS] Failed to add cue:", e, cue);
                    }
                  });

                  // Activate the track
                  track.mode = "showing";
                  console.log(
                    "[CAPTIONS] Track activated with",
                    track.cues.length,
                    "cues"
                  );
                }

                // Also try Plyr's caption methods
                player.toggleCaptions(true);
                if (player.captions) player.captions.active = true;
                if (typeof player.currentTrack === "number")
                  player.currentTrack = 0;

                console.log("[CAPTIONS] Manual caption loading completed");
              } catch (e) {
                console.warn("[CAPTIONS] Failed to load captions manually:", e);

                // Fallback to original method
                try {
                  const tracks = video.textTracks;
                  for (let i = 0; i < tracks.length; i++) {
                    tracks[i].mode = "showing";
                  }
                  player.toggleCaptions(true);
                  if (player.captions) player.captions.active = true;
                  console.log("[CAPTIONS] Fallback activation attempted");
                } catch (fallbackError) {
                  console.warn(
                    "[CAPTIONS] Fallback also failed:",
                    fallbackError
                  );
                }
              }
            }, 500);
          }
        });
      } else {
        // Last resort
        video.src = src;
        const player = new Plyr(video, {
          controls: [
            "play",
            "progress",
            "current-time",
            "mute",
            "volume",
            "settings",
            "pip",
            "airplay",
            "fullscreen",
          ],
          settings: ["captions", "speed"],
          captions: { active: true, language: "en", update: true },
          speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
          ratio: "16:9",
          clickToPlay: true,
          autoplay: false,
        });

        plyrRef.current = player;

        // Enable verbose caption debugging between here and ready handler
        if (true) {
          // Debug: Plyr captions-related events
          try {
            player.on("languagechange", () =>
              console.log("[PLYR][Fallback] languagechange", {
                language: player?.language,
              })
            );
          } catch {}
        }

        player.on("ready", () => {
          console.log("[PLYR][Fallback] ready");
          // Ensure captions are visible by default
          try {
            const tracks = video.textTracks;
            for (let i = 0; i < tracks.length; i++) {
              tracks[i].mode = "showing";
            }
            player.toggleCaptions(true);
            try {
              player.language = "en";
            } catch {}
            try {
              if (player.captions) player.captions.active = true;
              if (typeof player.currentTrack === "number")
                player.currentTrack = 0;
            } catch {}
            // Also bind to the <track> element load event for reliability
            const trackEl = video.querySelector("track");
            if (trackEl && trackEl.track) {
              const onTrackLoad = () => {
                try {
                  const cuesArr = trackEl.track.cues
                    ? Array.from(trackEl.track.cues)
                    : [];
                  const firstStart = cuesArr.length
                    ? Number(cuesArr[0].startTime?.toFixed?.(3) ?? 0)
                    : null;
                  const lastEnd = cuesArr.length
                    ? Number(
                        cuesArr[cuesArr.length - 1].endTime?.toFixed?.(3) ?? 0
                      )
                    : null;
                  console.log(
                    "[CAPTIONS][Fallback] Track loaded, cues:",
                    trackEl.track.cues?.length ?? 0
                  );
                  console.log(
                    "[CAPTIONS][Fallback] HTMLTrackElement.readyState:",
                    trackEl.readyState
                  );
                  console.log("[CAPTIONS][Fallback] cue range:", {
                    firstStart,
                    lastEnd,
                    videoDuration: Number(video.duration?.toFixed?.(2) || 0),
                  });
                  // Nudge rendering in some browsers
                  try {
                    const t = trackEl.track;
                    const prev = t.mode;
                    t.mode = "hidden";
                    t.mode = prev || "showing";
                  } catch {}
                  // Force-select/activate captions in Plyr as well
                  try {
                    if (player.captions) player.captions.active = true;
                    if (typeof player.currentTrack === "number")
                      player.currentTrack = 0;
                    player.toggleCaptions(true);
                  } catch {}
                } catch {}
              };
              const onTrackError = (e) => {
                console.error("[CAPTIONS][Fallback] Track error event", e);
                try {
                  console.log(
                    "[CAPTIONS][Fallback] HTMLTrackElement.readyState (on error):",
                    trackEl.readyState
                  );
                } catch {}
              };
              trackEl.addEventListener("load", onTrackLoad, { once: true });
              trackEl.addEventListener("error", onTrackError);
              // If already loaded, force showing
              try {
                trackEl.track.mode = "showing";
              } catch {}
            }
            console.log(
              "[CAPTIONS][Fallback] textTracks:",
              Array.from(video.textTracks || []).map((t) => ({
                kind: t.kind,
                label: t.label,
                lang: t.language,
                mode: t.mode,
                cues: t.cues?.length ?? 0,
              }))
            );
          } catch {}

          // Debug: overlay computed styles and geometry on ready (Fallback)
          try {
            const captionsEl =
              player?.elements?.container?.querySelector(".plyr__captions");
            if (captionsEl) {
              const cs = window.getComputedStyle(captionsEl);
              const r = captionsEl.getBoundingClientRect();
              console.log("[CAPTIONS][Fallback] overlay computed on ready", {
                display: cs.display,
                visibility: cs.visibility,
                opacity: cs.opacity,
                zIndex: cs.zIndex,
                rect: {
                  x: Math.round(r.x),
                  y: Math.round(r.y),
                  w: Math.round(r.width),
                  h: Math.round(r.height),
                },
              });
            }
          } catch {}

          // Try autoplay (muted). If the browser blocks, a manual click will play.
          tryAutoplay(player);

          // Force caption initialization after player is ready (Fallback)
          if (captionTrackUrl) {
            setTimeout(async () => {
              try {
                // Manually load VTT content to bypass Plyr's blob URL conversion
                const vttUrl = toBucketDomain(captionTrackUrl);
                console.log("[CAPTIONS] Loading VTT manually from:", vttUrl);

                const response = await fetch(vttUrl);
                if (!response.ok) {
                  throw new Error(`Failed to fetch VTT: ${response.status}`);
                }

                const vttContent = await response.text();
                console.log(
                  "[CAPTIONS] VTT content loaded, length:",
                  vttContent.length
                );

                // Parse VTT and inject cues directly
                const cues = parseVTT(vttContent);
                console.log("[CAPTIONS] Parsed cues:", cues.length);

                // Get the text track (should exist from <track> element)
                const tracks = video.textTracks;
                if (tracks.length > 0) {
                  const track = tracks[0];

                  // Clear existing cues
                  while (track.cues && track.cues.length > 0) {
                    track.removeCue(track.cues[0]);
                  }

                  // Add parsed cues
                  cues.forEach((cue) => {
                    try {
                      const vttCue = new VTTCue(
                        cue.startTime,
                        cue.endTime,
                        cue.text
                      );
                      console.log("[CAPTIONS] Adding cue:", vttCue);
                      track.addCue(vttCue);
                    } catch (e) {
                      console.warn("[CAPTIONS] Failed to add cue:", e, cue);
                    }
                  });

                  // Activate the track
                  track.mode = "showing";
                  console.log(
                    "[CAPTIONS] Track activated with",
                    track.cues.length,
                    "cues"
                  );
                }

                // Also try Plyr's caption methods
                player.toggleCaptions(true);
                if (player.captions) player.captions.active = true;
                if (typeof player.currentTrack === "number")
                  player.currentTrack = 0;

                console.log("[CAPTIONS] Manual caption loading completed");
              } catch (e) {
                console.warn("[CAPTIONS] Failed to load captions manually:", e);

                // Fallback to original method
                try {
                  const tracks = video.textTracks;
                  for (let i = 0; i < tracks.length; i++) {
                    tracks[i].mode = "showing";
                  }
                  player.toggleCaptions(true);
                  if (player.captions) player.captions.active = true;
                  console.log("[CAPTIONS] Fallback activation attempted");
                } catch (fallbackError) {
                  console.warn(
                    "[CAPTIONS] Fallback also failed:",
                    fallbackError
                  );
                }
              }
            }, 500);
          }
        });
      }
    };

    const onVideoError = () => {
      const e = video.error;
      console.error("[VIDEO ERROR]", e);
      if (!videoRef.current) return;
      setErr(e?.message || "Video element error");
    };
    const onLoadedMeta = () => {
      console.log("[VIDEO] loadedmetadata", { duration: video.duration });
    };
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };
    video.addEventListener("error", onVideoError);
    video.addEventListener("loadedmetadata", onLoadedMeta);
    video.addEventListener("timeupdate", onTimeUpdate);

    // Initialize player after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(initializePlayer, 100);

    return () => {
      clearTimeout(timeoutId);
      try {
        hlsRef.current?.destroy();
      } catch {}
      try {
        plyrRef.current?.destroy();
      } catch {}
      try {
        video.removeEventListener("error", onVideoError);
        video.removeEventListener("loadedmetadata", onLoadedMeta);
        video.removeEventListener("timeupdate", onTimeUpdate);
      } catch {}
    };
  }, [src]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only handle keyboard shortcuts when video is focused or no input is focused
      if (
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA"
      ) {
        return;
      }

      const video = videoRef.current;
      const player = plyrRef.current;

      if (!video || !player) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          if (video.paused) {
            player.play();
          } else {
            player.pause();
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case "ArrowRight":
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          player.volume = Math.min(1, player.volume + 0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          player.volume = Math.max(0, player.volume - 0.1);
          break;
        case "m":
        case "M":
          e.preventDefault();
          player.muted = !player.muted;
          break;
        case "f":
        case "F":
          e.preventDefault();
          player.fullscreen.toggle();
          break;
        case "k":
        case "K":
          e.preventDefault();
          if (video.paused) {
            player.play();
          } else {
            player.pause();
          }
          break;
        case "j":
        case "J":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case "l":
        case "L":
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;
        case "c":
        case "C":
          e.preventDefault();
          player.toggleCaptions();
          break;
        case "t":
        case "T":
          e.preventDefault();
          setShowTranscript(!showTranscript);
          break;
        case ",":
          e.preventDefault();
          if (video.paused) {
            video.currentTime = Math.max(0, video.currentTime - 1 / 30); // Frame backward
          }
          break;
        case ".":
          e.preventDefault();
          if (video.paused) {
            video.currentTime = Math.min(
              video.duration,
              video.currentTime + 1 / 30
            ); // Frame forward
          }
          break;
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          e.preventDefault();
          const percentage = parseInt(e.key) * 10;
          video.currentTime = (video.duration * percentage) / 100;
          break;
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [showTranscript]);

  useEffect(() => {
    if (!captionTrackUrl) return;
    const url = toBucketDomain(captionTrackUrl);
    fetch(url)
      .then((res) => res.text())
      .then((vttContent) => {
        const transcript = parseVTT(vttContent);
        setTranscriptData(transcript);
      })
      .catch((e) => console.error("[Transcript] Failed to fetch VTT:", e));
  }, [captionTrackUrl]);

  const filteredTranscript = transcriptData.filter(
    (cue) =>
      !searchTerm || cue.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full mt-3 relative z-10 pointer-events-auto">
      <style>{`
        .plyr--video .plyr__controls {
          display: flex !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
          position: absolute !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          background: linear-gradient(
            180deg,
            transparent,
            rgba(0, 0, 0, 0.8)
          ) !important;
          padding: 10px !important;
          z-index: 50 !important;
        }
        .plyr--video .plyr__control {
          color: white !important;
        }
        .plyr--video .plyr__progress {
          
        }
        .plyr--video .plyr__progress--played {
          background: #00bcd4 !important;
        }
        /* Settings menu container: white background, black text */
        .plyr--video .plyr__menu__container {
          background: #fff !important;
          color: #000 !important;
          padding: 1px !important;
          border-radius: 6px !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16) !important;
        }
        .plyr--video .plyr__menu__container * {
          color: #101828 !important;
          
        }
        .plyr--video .plyr__menu__list > li {
          margin-bottom: 10px !important;
        }
        .plyr--video .plyr__menu__list > li:last-child {
          margin-bottom: 0 !important;
        }
        /* Ensure HD badge text is white only on selected item or in controls */
        .plyr--video .plyr__menu__container .plyr__control[role='menuitemradio'][aria-checked='true'] .plyr__badge,
        .plyr--video .plyr__controls .plyr__badge {
          color: #fff !important;
        }
        /* Remove black background from the settings button */
        .plyr--video .plyr__controls [data-plyr='settings'],
        .plyr--video .plyr__control--menu {
          background: transparent !important;
        }
        /* Ensure captions overlay above the controls and video element */
        .plyr--video .plyr__captions {
          position: absolute !important;
          z-index: 60 !important;
          pointer-events: none !important;
          display: block !important;
          opacity: 1 !important;
          visibility: visible !important;
          bottom: 5% !important;
          left: 5% !important;
          right: 5% !important;
          text-align: center !important;
        }
        .plyr--video .plyr__captions .plyr__caption {
          color: #fff !important;
          background: rgba(0, 0, 0, 0.75) !important;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.9) !important;
          padding: 0.2em 0.2em !important;
          font-size: 22px !important;
          line-height: 1.4 !important;
          border-radius: 4px !important;
          font-weight: 500 !important;
          margin: 0 auto 0.5em auto !important;
          max-width: 80% !important;
          display: inline-block !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        }
       `}</style>
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        muted
        crossOrigin="anonymous"
        preload="auto"
        className="w-full rounded-xl overflow-hidden bg-black pointer-events-auto"
        style={{ position: "relative", pointerEvents: "auto" }}
      >
        {captionTrackUrl && (
          <track
            kind="captions"
            label="English"
            srcLang="en"
            src={toBucketDomain(captionTrackUrl)}
            default
          />
        )}
      </video>
      {err && (
        <div className="mt-2 text-sm text-red-400">
          Playback error: {String(err)}. Check GCS CORS and that the URL exists.
        </div>
      )}
      {transcriptData.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-600"
            >
              <svg
                className={`w-4 h-4 transition-transform ${
                  showTranscript ? "rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="font-medium">
                {showTranscript ? "Hide Transcript" : "Show Transcript"}
              </span>
              <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                {transcriptData.length} segments
              </span>
            </button>

            {showTranscript && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-300">
                  T
                </kbd>
                <span>Toggle transcript</span>
              </div>
            )}
          </div>

          {showTranscript && (
            <div className="bg-gray-950 border border-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-800 bg-gray-900">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search transcript..."
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="text-gray-400 hover:text-gray-200 p-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {filteredTranscript.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    {searchTerm
                      ? `${filteredTranscript.length} of ${transcriptData.length} segments`
                      : `${transcriptData.length} segments total`}
                  </div>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {filteredTranscript.map((cue, idx) => {
                  const isActive =
                    currentTime >= cue.startTime && currentTime <= cue.endTime;

                  return (
                    <div
                      key={idx}
                      className={`p-4 border-b border-gray-800 last:border-b-0 cursor-pointer transition-all duration-200 ${
                        isActive
                          ? "bg-cyan-900/50 border-l-4 border-l-cyan-400"
                          : "bg-gray-950 hover:bg-gray-900/50"
                      }`}
                      onClick={() => seekToTime(cue.startTime)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-xs px-2 py-1 rounded font-mono ${
                            isActive
                              ? "bg-cyan-800 text-cyan-100"
                              : "bg-gray-800 text-gray-400"
                          }`}
                        >
                          {formatTime(cue.startTime)} -{" "}
                          {formatTime(cue.endTime)}
                        </span>
                        {isActive && (
                          <div className="flex items-center gap-1 text-cyan-400">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium">Playing</span>
                          </div>
                        )}
                      </div>
                      <p
                        className={`text-sm leading-relaxed ${
                          isActive ? "text-white font-medium" : "text-gray-300"
                        }`}
                      >
                        {searchTerm ? (
                          <span
                            dangerouslySetInnerHTML={{
                              __html: cue.text.replace(
                                new RegExp(`(${searchTerm})`, "gi"),
                                '<mark class="bg-yellow-700 text-yellow-200 px-1 rounded">$1</mark>'
                              ),
                            }}
                          />
                        ) : (
                          cue.text
                        )}
                      </p>
                    </div>
                  );
                })}
                {searchTerm &&
                  transcriptData.filter((cue) =>
                    cue.text.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <svg
                          className="w-12 h-12 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.291-1.007-5.291-2.709M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                          />
                        </svg>
                        <p className="text-sm">
                          No transcript segments match your search
                        </p>
                        <button
                          onClick={() => setSearchTerm("")}
                          className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                        >
                          Clear search
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Toast notification component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor =
    type === "success"
      ? "bg-green-600"
      : type === "error"
      ? "bg-red-600"
      : "bg-blue-600";
  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";

  return (
    <div
      className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-slide-in`}
    >
      <span className="text-lg font-bold">{icon}</span>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 text-white hover:text-gray-200">
        ×
      </button>
    </div>
  );
};

// Enhanced Video Edit Modal Component
const VideoEditModal = ({ video, isOpen, onClose, onSave, showToast }) => {
  const [editData, setEditData] = useState({
    title: video?.title || "",
    description: video?.description || "",
    order: video?.order || 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (video) {
      setEditData({
        title: video.title || "",
        description: video.description || "",
        order: video.order || 0,
      });
    }
  }, [video]);

  const handleSave = async () => {
    if (!editData.title.trim()) {
      showToast("Video title is required", "error");
      return;
    }

    setIsLoading(true);
    try {
      console.log("[VideoEditModal] Saving with data:", editData);
      await onSave(editData);
      onClose();
      showToast("Video updated successfully!", "success");
    } catch (error) {
      console.error("Error updating video:", error);
      showToast("Failed to update video", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000]">
      <div className="bg-black rounded-lg p-6 w-full max-w-lg border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Edit Video</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Video Title *
            </label>
            <input
              type="text"
              value={editData.title}
              onChange={(e) =>
                setEditData({ ...editData, title: e.target.value })
              }
              className="w-full p-3 bg-black rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={editData.description}
              onChange={(e) =>
                setEditData({ ...editData, description: e.target.value })
              }
              rows={3}
              className="w-full p-3 bg-black rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              placeholder="Video description (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Order
            </label>
            <input
              type="number"
              value={editData.order}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  order: parseInt(e.target.value) || 0,
                })
              }
              className="w-full p-3 bg-black rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              min="0"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !editData.title.trim()}
            className="px-6 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit Course Modal Component
const EditCourseModal = ({
  course,
  isOpen,
  onClose,
  onSave,
  courseId,
  setToast,
  setCourse,
  fetchCourse,
}) => {
  const [editData, setEditData] = useState({
    title: course?.title || "",
    description: course?.description || "",
    category: course?.category || "",
    level: course?.level || "Beginner",
    duration: course?.duration || "",
    tags: course?.tags?.join(", ") || "",
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(
    course?.thumbnail?.url || ""
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (course) {
      setEditData({
        title: course.title || "",
        description: course.description || "",
        category: course.category || "",
        level: course.level || "Beginner",
        duration: course.duration || "",
        tags: course.tags?.join(", ") || "",
      });
      setThumbnailPreview(course.thumbnail?.url || "");
      setThumbnailFile(null);
    }
  }, [course]);

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setThumbnailPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const tagsArray = editData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      const updateData = { ...editData, tags: tagsArray };

      // Include thumbnail file in the main update if changed
      if (thumbnailFile) {
        updateData.thumbnailFile = thumbnailFile;
      }

      console.log("[EditCourseModal] Saving with data:", updateData);

      // If there's a thumbnail file, use FormData
      if (updateData.thumbnailFile) {
        console.log(
          "Creating FormData with thumbnail file:",
          updateData.thumbnailFile
        );
        console.log("Thumbnail file type:", updateData.thumbnailFile.type);
        console.log("Thumbnail file size:", updateData.thumbnailFile.size);

        const formData = new FormData();

        // Append all the text fields
        Object.keys(updateData).forEach((key) => {
          if (key !== "thumbnailFile") {
            if (key === "tags" && Array.isArray(updateData[key])) {
              formData.append(key, JSON.stringify(updateData[key]));
            } else {
              formData.append(key, updateData[key]);
            }
          }
        });

        // Append the thumbnail file
        formData.append("thumbnail", updateData.thumbnailFile);

        console.log("FormData contents:");
        for (let [key, value] of formData.entries()) {
          console.log(key, value);
        }

        const response = await adminApi.put(
          `/admin/courses/${courseId}/info`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        console.log(
          "[ManageCourse] updateCourseInfo response:",
          response.status,
          response.data
        );
        if (response.status === 200) {
          setCourse(response.data.course);
          fetchCourse(); // Refresh course data
          setToast({
            message: "Course updated successfully!",
            type: "success",
          });
        }
      } else {
        console.log("No thumbnail file, using regular JSON");
        // No thumbnail file, use regular JSON
        const response = await adminApi.put(
          `/admin/courses/${courseId}/info`,
          updateData
        );
        console.log(
          "[ManageCourse] updateCourseInfo response:",
          response.status,
          response.data
        );
        if (response.status === 200) {
          setCourse(response.data.course);
          fetchCourse(); // Refresh course data
          setToast({
            message: "Course updated successfully!",
            type: "success",
          });
        }
      }
    } catch (error) {
      console.error("Error updating course:", error);
      setToast({ message: "Failed to update course", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100]">
      <div className="bg-black rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Edit Course</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Thumbnail Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Course Thumbnail
            </label>
            <div className="flex items-center space-x-4">
              {thumbnailPreview && (
                <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-600">
                  <img
                    src={thumbnailPreview}
                    alt="Course thumbnail"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="w-full p-3 bg-black rounded-xl border border-gray-700 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Upload a new thumbnail image (JPG, PNG, GIF)
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Course Title
            </label>
            <input
              type="text"
              value={editData.title}
              onChange={(e) =>
                setEditData({ ...editData, title: e.target.value })
              }
              className="w-full p-3 bg-black rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={editData.description}
              onChange={(e) =>
                setEditData({ ...editData, description: e.target.value })
              }
              rows={4}
              className="w-full p-3 bg-black rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <input
                type="text"
                value={editData.category}
                onChange={(e) =>
                  setEditData({ ...editData, category: e.target.value })
                }
                className="w-full p-3 bg-black rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Course Level
              </label>
              <select
                value={editData.level}
                onChange={(e) =>
                  setEditData({ ...editData, level: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duration
            </label>
            <input
              type="text"
              value={editData.duration}
              onChange={(e) =>
                setEditData({ ...editData, duration: e.target.value })
              }
              className="w-full p-3 bg-black rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              placeholder="e.g., 10 hours, 5 weeks"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={editData.tags}
              onChange={(e) =>
                setEditData({ ...editData, tags: e.target.value })
              }
              className="w-full p-3 bg-black rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              placeholder="e.g., javascript, react, frontend"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ManageCourse = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { adminToken } = useAdminAuth();
  const [activeAssetId, setActiveAssetId] = useState(null);
  const [editingCourse, setEditingCourse] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    category: "",
    level: "",
    duration: "",
  });
  const [videoForm, setVideoForm] = useState({
    title: "",
    order: "",
  });
  const [toast, setToast] = useState({ message: "", type: "" });
  const [editCourseModalOpen, setEditCourseModalOpen] = useState(false);
  const [videoEditModalOpen, setVideoEditModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState({});

  const fetchCourse = async () => {
    try {
      setLoading(true);
      // Use adminApi which automatically handles authentication and correct URL
      const response = await adminApi.get(`/admin/courses/${courseId}`);
      setCourse(response.data.course); // Note: backend returns { course: ... }

      // Initialize course form with current data
      const courseData = response.data.course;
      setCourseForm({
        title: courseData.title || "",
        description: courseData.description || "",
        category: courseData.category || "",
        level: courseData.level || "",
        duration: courseData.duration || "",
      });
    } catch (err) {
      setError("Failed to fetch course data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseUpdate = async (updateData) => {
    setIsLoading(true);
    try {
      console.log("[ManageCourse] handleCourseUpdate called with:", updateData);
      // If there's a thumbnail file, use FormData
      if (updateData.thumbnailFile) {
        console.log(
          "Creating FormData with thumbnail file:",
          updateData.thumbnailFile
        );
        console.log("Thumbnail file type:", updateData.thumbnailFile.type);
        console.log("Thumbnail file size:", updateData.thumbnailFile.size);

        const formData = new FormData();

        // Append all the text fields
        Object.keys(updateData).forEach((key) => {
          if (key !== "thumbnailFile") {
            if (key === "tags" && Array.isArray(updateData[key])) {
              formData.append(key, JSON.stringify(updateData[key]));
            } else {
              formData.append(key, updateData[key]);
            }
          }
        });

        // Append the thumbnail file
        formData.append("thumbnail", updateData.thumbnailFile);

        console.log("FormData contents:");
        for (let [key, value] of formData.entries()) {
          console.log(key, value);
        }

        const response = await adminApi.put(
          `/admin/courses/${courseId}/info`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        console.log(
          "[ManageCourse] updateCourseInfo response:",
          response.status,
          response.data
        );
        if (response.status === 200) {
          setCourse(response.data.course);
          fetchCourse(); // Refresh course data
          setToast({
            message: "Course updated successfully!",
            type: "success",
          });
        }
      } else {
        console.log("No thumbnail file, using regular JSON");
        // No thumbnail file, use regular JSON
        const response = await adminApi.put(
          `/admin/courses/${courseId}/info`,
          updateData
        );
        console.log(
          "[ManageCourse] updateCourseInfo response:",
          response.status,
          response.data
        );
        if (response.status === 200) {
          setCourse(response.data.course);
          fetchCourse(); // Refresh course data
          setToast({
            message: "Course updated successfully!",
            type: "success",
          });
        }
      }
    } catch (error) {
      console.error("Error updating course:", error);
      setToast({ message: "Failed to update course", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoUpdate = async (assetId, data) => {
    try {
      await adminApi.put(`/admin/courses/${courseId}/videos/${assetId}`, data);
      await fetchCourse(); // Refresh course data
      setEditingVideo(null);
      setVideoForm({ title: "", order: "" });
      setToast({ message: "Video updated successfully!", type: "success" });
    } catch (err) {
      console.error("Failed to update video:", err);
      setToast({
        message: "Failed to update video. Please try again.",
        type: "error",
      });
    }
  };

  const handleVideoDelete = async (assetId, videoTitle) => {
    if (
      !confirm(
        `Are you sure you want to delete "${videoTitle}"? This will permanently remove the video and all its files from storage.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await adminApi.delete(`/admin/courses/${courseId}/videos/${assetId}`);
      await fetchCourse(); // Refresh course data
      setToast({ message: "Video deleted successfully!", type: "success" });
    } catch (err) {
      console.error("Failed to delete video:", err);
      setToast({
        message: "Failed to delete video. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const startEditingVideo = (video) => {
    setEditingVideo(video.assetId);
    setVideoForm({
      title: video.title || "",
      order: video.order || "",
    });
  };

  const startEditingVideoEnhanced = (video) => {
    setSelectedVideo(video);
    setVideoEditModalOpen(true);
  };

  const handleGenerateCaptions = async (assetId) => {
    setIsGeneratingCaptions((prev) => ({ ...prev, [assetId]: true }));
    setToast({ message: "Starting caption generation...", type: "info" });
    try {
      const response = await adminApi.post(
        `/admin/courses/${courseId}/videos/${assetId}/captions`
      );
      if (response.status === 202) {
        setToast({
          message: "Caption generation in progress. The page will refresh.",
          type: "success",
        });
        // Poll to check for updates
        setTimeout(() => fetchCourse(), 30000); // Refresh after 30s
        setTimeout(() => fetchCourse(), 90000); // And again after 90s
      }
    } catch (error) {
      console.error("Failed to start caption generation:", error);
      setToast({
        message:
          error.response?.data?.message ||
          "Failed to start caption generation.",
        type: "error",
      });
    } finally {
      // We don't set loading to false here, because the backend is working.
      // The status on the video will be our loading indicator.
    }
  };

  const handleDownloadCaptions = async (url, fileName = "captions.vtt") => {
    try {
      const normalized = toBucketDomain(url);
      const res = await fetch(normalized, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName.endsWith(".vtt") ? fileName : `${fileName}.vtt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      setToast({ message: "Captions downloaded.", type: "success" });
    } catch (e) {
      console.error("[Download Captions] Failed:", e);
      setToast({
        message:
          "Couldn't download captions automatically. Opening in a new tab...",
        type: "error",
      });
      try {
        window.open(url, "_blank", "noopener");
      } catch {}
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [courseId, adminToken]);

  if (loading) {
    return <div className="text-center py-10">Loading course details...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  if (!course) {
    return <div className="text-center py-10">Course not found.</div>;
  }

  return (
    <>
      <div className="min-h-screen bg-black text-white">
        {toast.message && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ message: "", type: "" })}
          />
        )}
        <div className="container mx-auto px-8 py-8">
          <Link
            to="/admin-dashboard"
            className="text-cyan-300 hover:text-cyan-200 mb-4 inline-block"
          >
            &larr; Back to Dashboard
          </Link>
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-start gap-6">
              {/* Course Thumbnail */}
              <div className="flex-shrink-0">
                {course.thumbnail?.url ? (
                  <img
                    src={course.thumbnail.url}
                    alt={`${course.title} thumbnail`}
                    className="w-32 h-20 object-cover rounded-lg border border-gray-600"
                  />
                ) : (
                  <div className="w-32 h-20 bg-gray-800 border border-gray-600 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500 text-xs text-center">
                      No Thumbnail
                    </span>
                  </div>
                )}
              </div>

              {/* Course Info */}
              <div>
                <h1 className="text-3xl font-bold mb-2">Manage Course</h1>
                <h2 className="text-xl font-semibold text-gray-400">
                  {course.title}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {course.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => setEditCourseModalOpen(true)}
              className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors font-medium"
            >
              Edit Course
            </button>
          </div>

          {/* Video Uploader Section */}
          <VideoUploader courseId={courseId} onUploadComplete={fetchCourse} />

          {/* Existing Videos List Section */}
          <div className="mt-8">
            <h3 className="text-2xl font-semibold mb-4">Uploaded Videos</h3>
            {course.videoLectures && course.videoLectures.length > 0 ? (
              <ul className="space-y-3">
                {course.videoLectures.map((video) => (
                  <li
                    key={video.assetId}
                    className="p-4 bg-black border border-gray-700 rounded-2xl"
                  >
                    <div className="flex justify-between items-center gap-3">
                      <span className="font-medium">{video.title}</span>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                            video.status === "completed"
                              ? "bg-green-900/40 text-green-300 border-green-700"
                              : "bg-yellow-900/40 text-yellow-300 border-yellow-700"
                          }`}
                        >
                          {video.status}
                        </span>
                        {video.status === "completed" && video.playbackUrl && (
                          <button
                            onClick={() =>
                              setActiveAssetId((prev) =>
                                prev === video.assetId ? null : video.assetId
                              )
                            }
                            className="px-3 py-1 rounded-lg border border-cyan-600 text-cyan-300 hover:bg-cyan-900/30"
                          >
                            {activeAssetId === video.assetId
                              ? "Hide"
                              : "Preview"}
                          </button>
                        )}
                        <button
                          onClick={() => startEditingVideoEnhanced(video)}
                          className="px-3 py-1 rounded-lg border border-cyan-600 text-cyan-300 hover:bg-cyan-900/30"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            handleVideoDelete(video.assetId, video.title)
                          }
                          className="px-3 py-1 rounded-lg border border-red-600 text-red-300 hover:bg-red-900/30"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {video.status === "completed" &&
                      activeAssetId === video.assetId &&
                      video.playbackUrl && (
                        <div className="w-full mt-3">
                          <PlyrPlayer
                            src={toBucketDomain(video.playbackUrl)}
                            poster={course.thumbnail?.url}
                            captionTrackUrl={toBucketDomain(
                              video.captionTrackUrl
                            )}
                          />
                        </div>
                      )}

                    {/* Action buttons - only show once */}
                    <div className="flex items-center gap-4 mt-3">
                      <button
                        onClick={() => startEditingVideoEnhanced(video)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          handleVideoDelete(video.assetId, video.title)
                        }
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>

                      {/* Caption Generation Button and Status */}
                      {video.status === "completed" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleGenerateCaptions(video.assetId)
                            }
                            disabled={
                              video.captionStatus === "processing" ||
                              isGeneratingCaptions[video.assetId]
                            }
                            className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {video.captionStatus === "processing"
                              ? "Generating..."
                              : "Generate Captions"}
                          </button>
                          {video.captionStatus === "completed" && (
                            <span className="text-xs text-green-400">
                              ✓ Ready
                            </span>
                          )}
                          {video.captionStatus === "failed" && (
                            <span className="text-xs text-red-400">
                              ✗ Failed
                            </span>
                          )}
                        </div>
                      )}
                      {video.captionStatus === "completed" &&
                        video.captionTrackUrl && (
                          <button
                            onClick={() =>
                              handleDownloadCaptions(
                                video.captionTrackUrl,
                                `captions-${video.assetId}.vtt`
                              )
                            }
                            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            Download VTT
                          </button>
                        )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">
                No videos have been uploaded for this course yet.
              </p>
            )}
          </div>

          {/* Course Editing Section */}
          {editCourseModalOpen && (
            <EditCourseModal
              course={course}
              isOpen={editCourseModalOpen}
              onClose={() => setEditCourseModalOpen(false)}
              onSave={handleCourseUpdate}
              courseId={courseId}
              setToast={setToast}
              setCourse={setCourse}
              fetchCourse={fetchCourse}
            />
          )}
          {videoEditModalOpen && (
            <VideoEditModal
              video={selectedVideo}
              isOpen={videoEditModalOpen}
              onClose={() => setVideoEditModalOpen(false)}
              onSave={(data) => handleVideoUpdate(selectedVideo?.assetId, data)}
              showToast={(message, type) => setToast({ message, type })}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default ManageCourse;
