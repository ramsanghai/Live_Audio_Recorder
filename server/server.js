import fs from "fs";
import path from "path";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { fileURLToPath } from "url";
import { spawn } from "child_process"; // To play audio on the server
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.use(cors());

// Ensure the save directory exists
const saveDirectory = path.join("D:", "Saved_audio");
if (!fs.existsSync(saveDirectory)) {
    fs.mkdirSync(saveDirectory, { recursive: true });
}

let writeStream = null;
let webmFilePath = null;
let ffplayProcess = null; // For live playback

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("startRecording", () => {
        webmFilePath = path.join(saveDirectory, `audio_${Date.now()}.webm`);
        writeStream = fs.createWriteStream(webmFilePath);

        console.log("🎤 Recording started:", webmFilePath);

        // Start live playback using ffplay
        if (ffplayProcess) {
            ffplayProcess.kill(); // Kill any existing process
        }
        ffplayProcess = spawn("ffplay", ["-nodisp", "-autoexit", "-i", webmFilePath]);

        ffplayProcess.on("error", (err) => console.error("❌ ffplay error:", err));
        ffplayProcess.on("exit", () => console.log("🎵 Live playback stopped."));
    });

    socket.on("audioStream", (data) => {
        if (!writeStream) {
            console.error("❌ No active recording session!");
            return;
        }

        console.log("✅ Received audio chunk:", data.length);
        writeStream.write(Buffer.from(new Uint8Array(data)), (err) => {
            if (err) console.error("❌ Error writing to file:", err);
        });
    });

    socket.on("stopRecording", () => {
        if (writeStream) {
            writeStream.end(() => {
                console.log("✅ Finished writing WebM file:", webmFilePath);
            });
            writeStream = null;

            // Stop live playback
            if (ffplayProcess) {
                ffplayProcess.kill();
                ffplayProcess = null;
            }
        }
    });

    socket.on("disconnect", () => {
        console.log("❌ User disconnected:", socket.id);
    });
});

server.listen(3000, () => {
    console.log("🚀 Server is running on port 3000");
});
