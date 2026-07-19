const express = require("express");
const multer = require("multer");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const DEVICE = "emulator:5555";

// Store uploads with original extension so adb install works with .apk
const storage = multer.diskStorage({
  destination: "/tmp/uploads",
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `upload-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB
});

fs.mkdirSync("/tmp/uploads", { recursive: true });

function adb(...args) {
  return new Promise((resolve, reject) => {
    execFile("adb", ["-s", DEVICE, ...args], { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

function cleanup(filePath) {
  fs.unlink(filePath, () => {});
}

// Push any file to /sdcard/Download/
app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file provided" });
  const localPath = req.file.path;
  const remotePath = `/sdcard/Download/${req.file.originalname}`;
  console.log(`[upload] ${req.file.originalname} -> ${remotePath}`);
  try {
    await adb("push", localPath, remotePath);
    res.json({ ok: true, path: remotePath });
  } catch (err) {
    console.error("[upload] Error:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    cleanup(localPath);
  }
});

// Install an APK
app.post("/api/install", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file provided" });
  const localPath = req.file.path;
  if (!req.file.originalname.toLowerCase().endsWith(".apk")) {
    cleanup(localPath);
    return res.status(400).json({ error: "File must be an APK" });
  }
  console.log(`[install] Installing ${req.file.originalname}...`);
  try {
    const output = await adb("install", "-r", localPath);
    console.log(`[install] Done: ${output.trim()}`);
    res.json({ ok: true, output: output.trim() });
  } catch (err) {
    console.error("[install] Error:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    cleanup(localPath);
  }
});

// Capture a screenshot and return it as a PNG download
app.get("/api/screenshot", (_req, res) => {
  execFile("adb", ["-s", DEVICE, "shell", "screencap", "-p"], { timeout: 10000, encoding: "buffer" }, (err, stdout) => {
    if (err) {
      console.error("[screenshot] Error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    const filename = `screenshot-${Date.now()}.png`;
    res.set("Content-Type", "image/png");
    res.set("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(stdout);
  });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`[adb-server] Listening on :${PORT}`));
