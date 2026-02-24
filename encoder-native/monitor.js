import { execa } from "execa";
import fs from "fs/promises";
import { spawn } from "child_process";
import path from "path";

const LOGS_DIR = "./logs";
const MONITOR_LOG = path.join(LOGS_DIR, "monitor.log");

// Ensure logs directory exists
await fs.mkdir(LOGS_DIR, { recursive: true });

class ContinuousMonitor {
  constructor() {
    this.encoderProcess = null;
    this.gpuMonitor = null;
    this.logTail = null;
    this.isRunning = false;
  }

  async log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;

    console.log(`🔍 ${message}`);
    await fs.appendFile(MONITOR_LOG, logEntry);
  }

  async startEncoder() {
    await this.log("Starting M2 GPU encoder...");

    this.encoderProcess = spawn("npm", ["start"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.encoderProcess.stdout.on("data", (data) => {
      console.log(data.toString());
    });

    this.encoderProcess.stderr.on("data", (data) => {
      console.error(data.toString());
    });

    this.encoderProcess.on("close", async (code) => {
      await this.log(`Encoder process exited with code ${code}`);
      if (this.isRunning) {
        await this.log("Restarting encoder in 5 seconds...");
        setTimeout(() => this.startEncoder(), 5000);
      }
    });

    this.encoderProcess.on("error", async (error) => {
      await this.log(`Encoder error: ${error.message}`);
    });
  }

  async monitorGPU() {
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

      let gpuInfo = {};
      for (const line of lines) {
        if (line.includes("GPU HW active frequency:")) {
          gpuInfo.frequency = line.split(":")[1]?.trim() || "N/A";
        }
        if (line.includes("GPU HW active residency:")) {
          gpuInfo.residency = line.split(":")[1]?.trim() || "N/A";
        }
        if (line.includes("GPU SW requested frequency:")) {
          gpuInfo.swFrequency = line.split(":")[1]?.trim() || "N/A";
        }
      }

      console.log("\n" + "=".repeat(60));
      console.log(" GPU STATUS (Apple M2)");
      console.log("=".repeat(60));
      console.log(` HW Active Frequency: ${gpuInfo.frequency || "N/A"}`);
      console.log(` HW Active Residency: ${gpuInfo.residency || "N/A"}`);
      console.log(` SW Requested Freq:   ${gpuInfo.swFrequency || "N/A"}`);
      console.log("=".repeat(60));
    } catch (error) {
      console.log("\n GPU monitoring failed (may need sudo permissions)");
    }
  }

  async monitorSystemStats() {
    try {
      const { stdout: vmStat } = await execa("vm_stat");
      const memLines = vmStat.split("\n");
      let memInfo = "";

      for (const line of memLines) {
        if (line.includes("Pages free:")) {
          const free =
            (parseInt(line.split(":")[1]?.trim()) * 4096) /
            (1024 * 1024 * 1024);
          memInfo += `Free: ${free.toFixed(1)}GB `;
        }
        if (line.includes("Pages active:")) {
          const active =
            (parseInt(line.split(":")[1]?.trim()) * 4096) /
            (1024 * 1024 * 1024);
          memInfo += `Active: ${active.toFixed(1)}GB `;
        }
      }

      const { stdout: topOutput } = await execa("top", ["-l", "1", "-n", "5"]);
      const cpuLine = topOutput
        .split("\n")
        .find((line) => line.includes("CPU usage:"));
      const cpuInfo = cpuLine ? cpuLine.split("CPU usage:")[1]?.trim() : "N/A";

      console.log("\n" + "-".repeat(60));
      console.log(" SYSTEM RESOURCES");
      console.log("-".repeat(60));
      console.log(` Memory: ${memInfo}`);
      console.log(` CPU: ${cpuInfo}`);
      console.log("-".repeat(60));
    } catch (error) {
      console.log("\n System stats monitoring failed");
    }
  }

  async startMonitoring() {
    console.log("\n Starting Enhanced M2 GPU Video Encoder Monitor");
    console.log(" Logs: ./logs/encoder.log");
    console.log(" Update Interval: 10 seconds");
    console.log(" Auto-restart: Enabled\n");

    await this.startEncoder();

    setInterval(async () => {
      const now = new Date().toLocaleTimeString();
      console.log(`\n ${now} - Monitoring Update`);

      if (!this.encoderProcess || this.encoderProcess.killed) {
        console.log(" Encoder process stopped, restarting...");
        await this.startEncoder();
      } else {
        console.log(
          " Encoder process: Running (PID: " + this.encoderProcess.pid + ")"
        );
      }

      await this.monitorGPU();
      await this.monitorSystemStats();

      console.log("\n" + "▼".repeat(60));
      console.log(" RECENT ENCODER LOGS:");
      console.log("▼".repeat(60));

      try {
        const { stdout } = await execa("tail", [
          "-n",
          "5",
          "./logs/encoder.log",
        ]);
        console.log(stdout);
      } catch (error) {
        console.log("No recent logs available");
      }

      console.log("▲".repeat(60));
      console.log(" Next update in 10 seconds...\n");
    }, 10000);

    setInterval(() => {
      const timestamp = new Date().toISOString();
      console.log(`\n Heartbeat: ${timestamp} - Monitor Active`);
    }, 30000);
  }

  async start() {
    this.isRunning = true;
    await this.log(" Starting continuous monitoring system...");

    await this.startMonitoring();

    await this.log(" All monitoring systems active");

    setInterval(async () => {
      if (this.isRunning) {
        await this.log(" Monitor heartbeat - All systems running");
      }
    }, 60000);
  }

  async stop() {
    this.isRunning = false;
    await this.log(" Stopping monitoring system...");

    if (this.encoderProcess) {
      this.encoderProcess.kill();
    }

    if (this.gpuMonitor) {
      this.gpuMonitor.kill();
    }

    if (this.logTail) {
      this.logTail.kill();
    }

    await this.log(" Monitoring system stopped");
  }
}

const monitor = new ContinuousMonitor();

process.on("SIGINT", async () => {
  console.log("\n Shutting down monitor...");
  await monitor.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await monitor.stop();
  process.exit(0);
});

await monitor.start();

process.stdin.resume();
