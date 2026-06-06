"use client"

import { useEffect, useRef, useState } from "react"
import { calculateMatchScore, rgbToHex, getContrastColour } from "../lib/colourMath"
import { DailyColour } from "../types"

interface ViewfinderProps {
    activeTarget: DailyColour | null;
    onPhotoCaptured: (score: number, playerHex: string) => void;
    onReset: () => void;
}

export default function Viewfinder({ activeTarget, onPhotoCaptured, onReset }: ViewfinderProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isShowingPhoto, setIsShowingPhoto] = useState(false);
    const [photoDataUrl, setPhotoDataUrl] = useState<string>("");

    // Initialise camera after mounting to the client broswer
    useEffect(() => {
        async function startCamera() {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });

                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    setStream(mediaStream);
                    setIsStreaming(true);
                }
            } catch (error) {
                console.error("Error accessing camera:", error);
                alert("Unable to access the camera. Please allow camera permissions and try again.");
            }
        }

        startCamera();

        // Clean up the media stream when the user leaves the page
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const capturePhoto = () => {
        if (isShowingPhoto) {
            // If already showing a photo, reset to the camera view
            setIsShowingPhoto(false);
            setPhotoDataUrl("");
            onReset();
            return;
        }

        if (!isStreaming || !videoRef.current || !canvasRef.current || !activeTarget) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) return;

        // Draw the current video frame to the canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Sample a small area of pixels from the center of the canvas to determine the average colour
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const sampleSize = 5;
        const startX = centerX - sampleSize / 2;
        const startY = centerY - sampleSize / 2;

        // Get pixel data from the center of the canvas
        const imgData = context.getImageData(startX, startY, sampleSize, sampleSize);
        const data = imgData.data;

        let totalR = 0, totalG = 0, totalB = 0;
        const pixelCount = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
            totalR += data[i];
            totalG += data[i + 1];
            totalB += data[i + 2];
        }

        const avgR = Math.round(totalR / pixelCount);
        const avgG = Math.round(totalG / pixelCount);
        const avgB = Math.round(totalB / pixelCount);
        const detectedHex = rgbToHex(avgR, avgG, avgB);

        // Calculate the match score against the active target colour
        const matchScore = calculateMatchScore(
            activeTarget.r,
            activeTarget.g,
            activeTarget.b,
            avgR,
            avgG,
            avgB
        );

        // Pass the match score and the detected colour back to the parent component
        const dataURL = canvas.toDataURL("image/png");
        setPhotoDataUrl(dataURL);
        setIsShowingPhoto(true);

        onPhotoCaptured(matchScore, detectedHex);
    };

    return (
        <div className="flex flex-col items-center w-full max-w-[400px]">
            {/* Viewfinder Window Frame */}
            <div className="relative w-full aspect-[3/4] mb-5 rounded-xl overflow-hidden border-4 border-white shadow-lg bg-black">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-200 ${isShowingPhoto ? "opacity-0 pointer-events-none" : "opacity-100"
                        }`}
                />

                {isShowingPhoto && (
                    <img
                        src={photoDataUrl}
                        alt="Your captured frame"
                        className="absolute top-0 left-0 w-full h-full object-cover"
                    />
                )}

                {/* Central Targeting Reticle Overlay */}
                {!isShowingPhoto && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 border-3 border-white rounded shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-10 pointer-events-none" />
                )}
            </div>

            {/* Hidden processing frame buffer canvas layer */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Dynamic Action Trigger Trigger Button */}
            <button
                onClick={capturePhoto}
                disabled={!isStreaming && !isShowingPhoto}
                className={`w-full py-3.5 text-base font-bold rounded-lg shadow-md transition-all duration-200 active:scale-95 disabled:opacity-50 ${isShowingPhoto
                    ? "bg-slate-700 hover:bg-slate-800 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
            >
                {isShowingPhoto ? "Try Again" : "Take Photo"}
            </button>
        </div>
    );
}