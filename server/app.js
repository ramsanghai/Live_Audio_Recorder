import fs from 'fs';
import path from 'path';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';


// Fix __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors({
    origin: 'http://localhost:5173', // Allow requests from React app
    methods: ['GET', 'POST']
}));

// Enable CORS for Socket.IO
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

// Ensure the save directory exists
const saveDirectory = path.join('D:', 'Saved_audio');
if (!fs.existsSync(saveDirectory)) {
    fs.mkdirSync(saveDirectory, { recursive: true });
}

// File path for storing audio
const audioFilePath = path.join(saveDirectory, 'audio_output.wav');
const writeStream = fs.createWriteStream(audioFilePath, { flags: 'a' });

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('audio-data', (data) => {
        console.log('Received audio data:', data.length);

        // Convert data to a Buffer and append it to the file
        const buffer = Buffer.from(new Uint8Array(data));
        writeStream.write(buffer);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
