#!/usr/bin/env node

import { execa } from "execa";
import { readFileSync } from "fs";

class EncodingMonitor {
  constructor() {
    this.isRunning = true;
    this.lastLogPosition = 0;
    this.activeEncodings = new Map();
    this.encodingStats = {
      totalProcessed: 0,
      currentlyEncoding: 0,
      averageFPS: 0,
      totalFrames: 0,
    };
  }

  async getGPUInfo() {
    try {
      const { stdout } = await execa("sudo", [
        "powermetrics",
        "--samplers",
        "gpu_power",
        "-n",
        "1",
        "-i",
        "500",
      ]);
      const lines = stdout.split("\n");

      let gpuData = {
        frequency: "N/A",
        residency: "N/A",
        power: "N/A",
      };

      for (const line of lines) {
        if (line.includes("GPU HW active frequency:")) {
          gpuData.frequency = line.split(":")[1]?.trim() || "N/A";
        }
        if (line.includes("GPU HW active residency:")) {
          gpuData.residency = line.split(":")[1]?.trim() || "N/A";
        }
        if (line.includes("GPU Power:")) {
          gpuData.power = line.split(":")[1]?.trim() || "N/A";
        }
      }

      return gpuData;
    } catch (error) {
      return { frequency: "N/A", residency: "N/A", power: "N/A" };
    }
  }

  async checkActiveFFmpegProcesses() {
    try {
      // Check for active FFmpeg processes
      const { stdout } = await execa("pgrep", ["-f", "ffmpeg"]);
      const pids = stdout
        .trim()
        .split("\n")
        .filter((pid) => pid);

      const activeProcesses = [];
      for (const pid of pids) {
        try {
          // Get process details
          const { stdout: psOutput } = await execa("ps", [
            "-p",
            pid,
            "-o",
            "command=",
          ]);
          if (psOutput.includes("h264_videotoolbox")) {
            // Extract resolution from command
            let resolution = "unknown";
            if (psOutput.includes("1920:1080")) resolution = "1080";
            else if (psOutput.includes("1280:720")) resolution = "720";
            else if (psOutput.includes("854:480")) resolution = "480";

            activeProcesses.push({
              pid,
              resolution,
              command: psOutput.substring(0, 100) + "...",
            });
          }
        } catch (error) {
          // Process might have finished, ignore
        }
      }

      return activeProcesses;
    } catch (error) {
      return [];
    }
  }

  parseEncodingProgress(logLine) {
    try {
      const logData = JSON.parse(logLine);

      // Check for encoding start (existing format)
      if (logData.msg && logData.msg.includes("Starting HLS encoding")) {
        return {
          type: "hls_start",
          resolutions: logData.resolutions || 3,
          codec: logData.codec || "h264_videotoolbox",
        };
      }

      // Check for processing started
      if (logData.msg && logData.msg.includes("Processing started")) {
        return {
          type: "processing_start",
          objectName: logData.objectName || "Unknown video",
        };
      }

      // Check for HLS encoding completed
      if (logData.msg && logData.msg.includes("HLS encoding completed")) {
        return {
          type: "hls_complete",
          duration:
            logData.totalEncodingTimeSec || logData.totalDuration || "N/A",
        };
      }

      // Check for new progress format
      if (logData.msg && logData.msg.includes("Encoding Progress")) {
        const resolution = logData.msg.match(/\[(\d+)p\]/)?.[1] || "unknown";
        return {
          type: "progress",
          resolution,
          progress: logData.progress || "0%",
          frame: logData.frame || 0,
          fps: logData.fps || "0",
          bitrate: logData.bitrate || "N/A",
          speed: logData.speed || "N/A",
          efficiency: logData.efficiency || "N/A",
          timeProcessed: logData.timeProcessed || "0s",
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async readNewLogs() {
    try {
      const logContent = readFileSync("./logs/encoder.log", "utf8");
      const lines = logContent.split("\n");
      const newLines = lines.slice(this.lastLogPosition);
      this.lastLogPosition = lines.length;

      const encodingEvents = [];
      for (const line of newLines) {
        if (line.trim()) {
          const event = this.parseEncodingProgress(line);
          if (event) {
            encodingEvents.push(event);
          }
        }
      }

      return encodingEvents;
    } catch (error) {
      return [];
    }
  }

  updateEncodingStats(events, activeProcesses) {
    // Update from log events
    for (const event of events) {
      if (event.type === "hls_start" || event.type === "processing_start") {
        this.activeEncodings.set("hls_encoding", {
          type: "HLS Multi-Resolution",
          startTime: Date.now(),
          resolutions: event.resolutions || 3,
          objectName: event.objectName || "Processing video...",
          lastFPS: 0,
          lastProgress: "Starting...",
        });
      } else if (event.type === "hls_complete") {
        this.activeEncodings.clear();
        this.encodingStats.totalProcessed++;
      } else if (event.type === "progress") {
        const encoding = this.activeEncodings.get("hls_encoding");
        if (encoding) {
          encoding.lastFPS = parseFloat(event.fps) || 0;
          encoding.lastProgress = event.progress;
          encoding.lastFrame = event.frame;
          encoding.lastBitrate = event.bitrate;
          encoding.lastSpeed = event.speed;
        }
      }
    }

    // Update from active processes (more reliable for current state)
    if (activeProcesses.length > 0) {
      for (const proc of activeProcesses) {
        const key = `ffmpeg_${proc.resolution}`;
        if (!this.activeEncodings.has(key)) {
          this.activeEncodings.set(key, {
            type: `FFmpeg ${proc.resolution}p`,
            startTime: Date.now(),
            pid: proc.pid,
            lastFPS: "Detecting...",
            lastProgress: "Active",
            resolution: proc.resolution,
          });
        }
      }

      // Remove processes that are no longer active
      for (const [key, encoding] of this.activeEncodings) {
        if (key.startsWith("ffmpeg_")) {
          const stillActive = activeProcesses.some(
            (proc) => proc.pid === encoding.pid
          );
          if (!stillActive) {
            this.activeEncodings.delete(key);
          }
        }
      }
    } else {
      // Remove FFmpeg processes if none are active
      for (const [key] of this.activeEncodings) {
        if (key.startsWith("ffmpeg_")) {
          this.activeEncodings.delete(key);
        }
      }
    }

    this.encodingStats.currentlyEncoding = this.activeEncodings.size;
  }

  displayStatus(gpuData, activeProcesses) {
    console.clear();

    const timestamp = new Date().toLocaleTimeString();

    console.log("╔" + "═".repeat(78) + "╗");
    console.log(
      "║" + " ".repeat(20) + "🎬 M2 GPU ENCODING MONITOR" + " ".repeat(20) + "║"
    );
    console.log("╠" + "═".repeat(78) + "╣");
    console.log(
      `║ 🕐 Time: ${timestamp.padEnd(30)} GPU: ${gpuData.residency.padEnd(
        20
      )} ║`
    );
    console.log("╠" + "═".repeat(78) + "╣");

    // GPU Status
    console.log(
      `║ 🔥 GPU Frequency: ${gpuData.frequency.padEnd(
        25
      )} Power: ${gpuData.power.padEnd(15)} ║`
    );
    console.log("╠" + "═".repeat(78) + "╣");

    // Process Status
    console.log(
      `║ 📊 Active FFmpeg: ${activeProcesses.length
        .toString()
        .padEnd(10)} Total Processed: ${this.encodingStats.totalProcessed
        .toString()
        .padEnd(15)} ║`
    );
    console.log("╠" + "═".repeat(78) + "╣");

    if (this.activeEncodings.size === 0 && activeProcesses.length === 0) {
      console.log(
        "║" + " ".repeat(30) + "💤 NO ACTIVE ENCODING" + " ".repeat(25) + "║"
      );
      console.log(
        "║" +
          " ".repeat(25) +
          "Waiting for video processing..." +
          " ".repeat(20) +
          "║"
      );
    } else {
      console.log(
        "║" + " ".repeat(28) + "🔄 ACTIVE ENCODINGS" + " ".repeat(28) + "║"
      );
      console.log("╠" + "═".repeat(78) + "╣");

      // Show active FFmpeg processes
      if (activeProcesses.length > 0) {
        console.log("║ 🎯 LIVE FFMPEG PROCESSES:" + " ".repeat(50) + "║");
        for (const proc of activeProcesses) {
          const runtime = "Running";
          console.log(
            `║    • ${proc.resolution}p encoding (PID: ${proc.pid})`.padEnd(
              77
            ) + "║"
          );
        }
        console.log("╠" + "─".repeat(78) + "╣");
      }

      // Show tracked encodings
      for (const [key, encoding] of this.activeEncodings) {
        const runtime = ((Date.now() - encoding.startTime) / 1000).toFixed(0);
        console.log(
          `║ 🎬 ${encoding.type}: ${encoding.lastProgress
            .toString()
            .padEnd(12)} Runtime: ${runtime}s`.padEnd(77) + "║"
        );

        if (encoding.lastFPS && encoding.lastFPS !== "Detecting...") {
          console.log(
            `║    └─ FPS: ${encoding.lastFPS.toString().padEnd(8)} │ Frame: ${
              encoding.lastFrame || "N/A"
            }`.padEnd(77) + "║"
          );
        }

        if (encoding.objectName) {
          const shortName =
            encoding.objectName.length > 50
              ? encoding.objectName.substring(0, 47) + "..."
              : encoding.objectName;
          console.log(`║    └─ File: ${shortName}`.padEnd(77) + "║");
        }

        console.log("╠" + "─".repeat(78) + "╣");
      }
    }

    console.log(
      "║ 🔄 Updates every 2 seconds | Press Ctrl+C to exit" +
        " ".repeat(26) +
        "║"
    );
    console.log("╚" + "═".repeat(78) + "╝");

    // Status indicators based on GPU usage
    const residencyNum = parseFloat(gpuData.residency?.replace("%", "") || "0");
    if (residencyNum > 50 || activeProcesses.length > 0) {
      console.log("\n🔥 HIGH GPU ACTIVITY - Video encoding in progress!");
    } else if (residencyNum > 10) {
      console.log("\n⚡ MODERATE GPU USAGE");
    } else {
      console.log("\n💤 LOW GPU USAGE - Encoder idle");
    }

    console.log(
      "\n💡 Tip: This monitor detects both new and existing encoding processes"
    );
  }

  async start() {
    console.log("🚀 Starting M2 GPU Encoding Monitor...");
    console.log("📊 Monitoring active FFmpeg processes and encoding progress");
    console.log("⚠️  Note: Requires sudo permissions for GPU monitoring\n");

    // Initial delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const monitorLoop = async () => {
      if (!this.isRunning) return;

      // Get GPU data
      const gpuData = await this.getGPUInfo();

      // Check for active FFmpeg processes
      const activeProcesses = await this.checkActiveFFmpegProcesses();

      // Read new log entries
      const events = await this.readNewLogs();
      this.updateEncodingStats(events, activeProcesses);

      // Display current status
      this.displayStatus(gpuData, activeProcesses);

      // Schedule next update
      setTimeout(monitorLoop, 2000); // Update every 2 seconds
    };

    monitorLoop();
  }

  stop() {
    this.isRunning = false;
    console.clear();
    console.log("🛑 Encoding Monitor stopped");
  }
}

// Create and start monitor
const encodingMonitor = new EncodingMonitor();

// Handle graceful shutdown
process.on("SIGINT", () => {
  encodingMonitor.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  encodingMonitor.stop();
  process.exit(0);
});

// Start monitoring
await encodingMonitor.start();

// Keep process alive
process.stdin.resume();
