"use client"

import { useEffect, useRef, useState } from "react"
import { calculateMatchScore, rgbToHex } from "../lib/colourMath"
import { DailyColour } from "../types"

interface ViewfinderProps {
    activeTarget: DailyColour | null;
    onPhotoCaptured: (score: number, playerHex: string, photoDataUrl: string) => void;
    isLockedToday: boolean;
    savedPhoto: string;
    onReset: () => void;
}

export default function Viewfinder({
    activeTarget,
    onPhotoCaptured,
    isLockedToday,
    savedPhoto,
    onReset
}: ViewfinderProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isShowingPhoto, setIsShowingPhoto] = useState(false);
    const [photoDataUrl, setPhotoDataUrl] = useState<string>("");

    // Initialize camera streams only if the player hasn't already locked today's puzzle attempt
    useEffect(() => {
        if (isLockedToday) return;

        async function startCamera() {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" },
                    audio: false,
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    setStream(mediaStream);
                    setIsStreaming(true);
                }
            } catch (err) {
                console.error("Error accessing camera stream:", err);
                alert("Could not access camera. Ensure you are using HTTPS and have granted permissions.");
            }
        }
        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    const capturePhoto = () => {
        if (isShowingPhoto) {
            // User clicked "Try Again" on an unsuccessful attempt
            setIsShowingPhoto(false);
            setPhotoDataUrl("");
            onReset();
            return;
        }

        if (isLockedToday || !isStreaming || !videoRef.current || !canvasRef.current || !activeTarget) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const sampleSize = 5;
        const startX = centerX - sampleSize / 2;
        const startY = centerY - sampleSize / 2;

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

        const matchScore = calculateMatchScore(
            activeTarget.r,
            activeTarget.g,
            activeTarget.b,
            avgR,
            avgG,
            avgB
        );

        const dataURL = canvas.toDataURL("image/png");

        if (matchScore < 80) {
            setPhotoDataUrl(dataURL);
            setIsShowingPhoto(true);
        }

        onPhotoCaptured(matchScore, detectedHex, dataURL);
    };

    return (
        <div className="flex flex-col items-center w-full max-w-[400px]">
            {/* Bounding Viewfinder Frame Wrapper */}
            <div className="relative w-full aspect-[3/4] mb-5 rounded-xl overflow-hidden border-4 border-white shadow-lg bg-black">
                {!isLockedToday ? (
                    <>
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
                                alt="Your un-successful capture attempt"
                                className="absolute top-0 left-0 w-full h-full object-cover"
                            />
                        )}

                        {/* Central Targeting Reticle Overlay */}
                        {!isShowingPhoto && (
                            <svg
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                                className="absolute inset-0 w-full h-full z-10 pointer-events-none"
                                aria-hidden="true"
                            >
                                <defs>
                                    <mask id="reticle-hole">
                                        <rect x="0" y="0" width="100" height="100" fill="white" />
                                        {/* centered 12x12 square hole */}
                                        <rect x="44" y="44" width="12" height="12" fill="black" rx="2" ry="2" />
                                    </mask>
                                </defs>

                                {/* dark overlay with transparent hole */}
                                <rect width="100" height="100" fill="rgba(0,0,0,0.5)" mask="url(#reticle-hole)" />

                                {/* white hollow square border centered over the hole */}
                                <rect x="44" y="44" width="12" height="12" fill="transparent" stroke="#ffffff" strokeWidth="1.5" rx="2" />
                            </svg>
                        )}
                    </>
                ) : (
                    /* Render the permanent winning target snapshot once matched successfully */
                    <img
                        src={savedPhoto}
                        alt="Your victory submission frame"
                        className="absolute top-0 left-0 w-full h-full object-cover"
                    />
                )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <button
                onClick={capturePhoto}
                disabled={(!isStreaming && !isShowingPhoto) && !isLockedToday}
                className={`w-full py-3.5 text-base font-bold rounded-lg shadow-md transition-all duration-200 tracking-wide active:scale-95 disabled:opacity-50 ${isLockedToday
                    ? "bg-emerald-700 text-emerald-200 cursor-not-allowed shadow-none"
                    : isShowingPhoto
                        ? "bg-slate-700 hover:bg-slate-800 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
            >
                {isLockedToday ? "✓ Entry Logged" : isShowingPhoto ? "Try Again" : "Take Photo"}
            </button>
        </div>
    );
}