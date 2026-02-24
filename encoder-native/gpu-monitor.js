#!/usr/bin/env node

import { execa } from "execa";

class GPUMonitor {
  constructor() {
    this.isRunning = true;
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
        "1000",
      ]);
      const lines = stdout.split("\n");

      let gpuData = {
        frequency: "N/A",
        residency: "N/A",
        swFrequency: "N/A",
        power: "N/A",
        temperature: "N/A",
      };

      for (const line of lines) {
        if (line.includes("GPU HW active frequency:")) {
          gpuData.frequency = line.split(":")[1]?.trim() || "N/A";
        }
        if (line.includes("GPU HW active residency:")) {
          gpuData.residency = line.split(":")[1]?.trim() || "N/A";
        }
        if (line.includes("GPU SW requested frequency:")) {
          gpuData.swFrequency = line.split(":")[1]?.trim() || "N/A";
        }
        if (line.includes("GPU Power:")) {
          gpuData.power = line.split(":")[1]?.trim() || "N/A";
        }
      }

      return gpuData;
    } catch (error) {
      return {
        error: "Failed to get GPU info - may need sudo permissions",
        message: error.message,
      };
    }
  }

  async getSystemInfo() {
    try {
      // Get temperature info
      const { stdout: tempInfo } = await execa("sudo", [
        "powermetrics",
        "--samplers",
        "smc",
        "-n",
        "1",
        "-i",
        "1000",
      ]);
      let temperature = "N/A";

      const tempLines = tempInfo.split("\n");
      for (const line of tempLines) {
        if (line.includes("CPU die temperature:")) {
          temperature = line.split(":")[1]?.trim() || "N/A";
          break;
        }
      }

      return { temperature };
    } catch (error) {
      return { temperature: "N/A" };
    }
  }

  displayGPUStatus(gpuData, systemData) {
    // Clear screen for better readability
    console.clear();

    const timestamp = new Date().toLocaleTimeString();

    console.log("╔" + "═".repeat(58) + "╗");
    console.log(
      "║" +
        " ".repeat(10) +
        "🔥 M2 GPU REAL-TIME MONITOR" +
        " ".repeat(10) +
        "║"
    );
    console.log("╠" + "═".repeat(58) + "╣");
    console.log(`║ 🕐 Time: ${timestamp.padEnd(45)} ║`);
    console.log("╠" + "═".repeat(58) + "╣");

    if (gpuData.error) {
      console.log("║ ❌ ERROR: " + gpuData.error.padEnd(43) + "║");
      console.log("║ " + gpuData.message.padEnd(56) + "║");
    } else {
      console.log(
        `║ 📊 HW Active Frequency: ${gpuData.frequency.padEnd(30)} ║`
      );
      console.log(
        `║ ⚡ HW Active Residency: ${gpuData.residency.padEnd(31)} ║`
      );
      console.log(
        `║ 💻 SW Requested Freq:   ${gpuData.swFrequency.padEnd(31)} ║`
      );
      console.log(`║ 🔋 GPU Power:           ${gpuData.power.padEnd(31)} ║`);
      console.log(
        `║ 🌡️  System Temperature:  ${systemData.temperature.padEnd(30)} ║`
      );
    }

    console.log("╠" + "═".repeat(58) + "╣");
    console.log("║ 🔄 Updates every 5 seconds | Press Ctrl+C to exit    ║");
    console.log("╚" + "═".repeat(58) + "╝");

    // Show usage indicator
    if (gpuData.residency && gpuData.residency !== "N/A") {
      const residencyNum = parseFloat(gpuData.residency.replace("%", ""));
      if (residencyNum > 50) {
        console.log("\n🔥 HIGH GPU USAGE - Video encoding likely active!");
      } else if (residencyNum > 10) {
        console.log("\n⚡ MODERATE GPU USAGE");
      } else {
        console.log("\n💤 LOW GPU USAGE - GPU mostly idle");
      }
    }

    console.log('\n📝 Tip: Run "npm run monitor" for full encoder monitoring');
  }

  async start() {
    console.log("🚀 Starting M2 GPU Monitor...");
    console.log("⚠️  Note: This requires sudo permissions for powermetrics");
    console.log("⏱️  Updating every 5 seconds for real-time monitoring\n");

    // Initial delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const monitorLoop = async () => {
      if (!this.isRunning) return;

      const gpuData = await this.getGPUInfo();
      const systemData = await this.getSystemInfo();

      this.displayGPUStatus(gpuData, systemData);

      // Schedule next update
      setTimeout(monitorLoop, 5000); // Update every 5 seconds
    };

    monitorLoop();
  }

  stop() {
    this.isRunning = false;
    console.clear();
    console.log("🛑 GPU Monitor stopped");
  }
}

// Create and start monitor
const gpuMonitor = new GPUMonitor();

// Handle graceful shutdown
process.on("SIGINT", () => {
  gpuMonitor.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  gpuMonitor.stop();
  process.exit(0);
});

// Start monitoring
await gpuMonitor.start();

// Keep process alive
process.stdin.resume();
