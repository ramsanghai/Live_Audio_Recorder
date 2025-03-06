import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

function App() {
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
                setMediaRecorder(recorder);

                recorder.onstart = () => {
                    socket.emit("startRecording");
                };

                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        console.log("📤 Sending audio chunk:", event.data.size);
                        socket.emit("audioStream", event.data);
                    }
                };

                socket.on("playAudio", (data) => {
                    console.log("🔊 Receiving & playing live audio...");
                    const audioBlob = new Blob([data], { type: "audio/mp3" });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    audioRef.current.src = audioUrl;
                    audioRef.current.play().catch(err => console.error("Playback error:", err));
                });
            })
            .catch((err) => console.error("❌ Microphone access error:", err));
    }, []);

    const startRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.start(100); // Send chunks every 100ms
            setIsRecording(true);
            console.log("🎙️ Recording started...");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
            socket.emit("stopRecording");
            console.log("🛑 Recording stopped.");
        }
    };

    return (
        <div>
            <h1>Live Audio Streaming</h1>
            <button onClick={startRecording} disabled={isRecording}>Start Recording</button>
            <button onClick={stopRecording} disabled={!isRecording}>Stop Recording</button>
            <audio ref={audioRef} controls />
        </div>
    );
}

export default App;
