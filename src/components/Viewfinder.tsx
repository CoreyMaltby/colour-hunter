"use client";

import { useEffect, useRef, useState } from "react";
import { calculateMatchScore } from "../lib/colourMath";
import { DailyColour } from "../types";

interface ViewfinderProps {
  activeTarget: DailyColour | null;
  onPhotoCaptured: (score: number, playerHex: string, photoDataUrl: string) => void;
  isLockedToday: boolean;
  savedPhoto: string;
}

export default function Viewfinder({
  activeTarget,
  onPhotoCaptured,
  isLockedToday,
  savedPhoto,
}: ViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [hasCameraError, setHasCameraError] = useState<boolean>(false);
  const [isShowingPhoto, setIsShowingPhoto] = useState<boolean>(false);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [supportsTorch, setSupportsTorch] = useState<boolean>(false);

  useEffect(() => {
    if (isLockedToday) {
      if (savedPhoto) {
        setLocalPhotoUrl(savedPhoto);
        setIsShowingPhoto(true);
      }
      return;
    }

    async function setupCameraStream() {
      try {
        setHasCameraError(false);
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        const videoConstraints: MediaTrackConstraints = {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        };

        const hardwareStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        setStream(hardwareStream);
        const track = hardwareStream.getVideoTracks()[0];
        setVideoTrack(track || null);

        const capabilities = track?.getCapabilities?.();
        const supportsTorchCapability = Boolean(capabilities && "torch" in capabilities);
        setSupportsTorch(supportsTorchCapability);
        if (!supportsTorchCapability) {
          setFlashOn(false);
        }

        if (flashOn && supportsTorchCapability && track) {
          try {
            await (track as any).applyConstraints({ advanced: [{ torch: true }] });
          } catch (flashError) {
            console.warn("Flash/torch enable failed:", flashError);
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = hardwareStream;
        }
      } catch (err) {
        console.error("Camera interface initialization fault:", err);
        setHasCameraError(true);
      }
    }
    setupCameraStream();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isLockedToday, savedPhoto, facingMode]);

  useEffect(() => {
    if (!videoTrack || !supportsTorch) return;

    async function updateTorch() {
      try {
        if (!videoTrack || !videoTrack.applyConstraints) return;
        await (videoTrack as any).applyConstraints({ advanced: [{ torch: flashOn }] });
      } catch (err) {
        console.warn("Unable to set flash state:", err);
      }
    }

    updateTorch();
  }, [flashOn, videoTrack, supportsTorch]);

  const handleToggleLensFacing = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const handleCapturePhotoAction = () => {
    if (!videoRef.current || !canvasRef.current || !activeTarget) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    ctx.restore();

    const dataURL = canvas.toDataURL("image/jpeg", 0.85);

    const pixelSample = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
    const detectedR = pixelSample[0];
    const detectedG = pixelSample[1];
    const detectedB = pixelSample[2];

    const convertToHex = (r: number, g: number, b: number) => {
      return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
    };
    const playerHexOutputStr = convertToHex(detectedR, detectedG, detectedB);

    const matchScore = calculateMatchScore(
      activeTarget.r, activeTarget.g, activeTarget.b,
      detectedR, detectedG, detectedB
    );

    setLocalPhotoUrl(dataURL);
    onPhotoCaptured(matchScore, playerHexOutputStr, dataURL);
  };

  return (
    <div className="w-full max-w-[400px] flex flex-col items-center">
      <div className="w-full aspect-[3/4] bg-black rounded-xl overflow-hidden mb-5 border-4 border-white shadow-lg relative">
        
        {!isShowingPhoto && !hasCameraError && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute top-0 left-0 w-full h-full object-cover"
            style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
          />
        )}

        {isShowingPhoto && (
          <img
            src={localPhotoUrl}
            alt="Captured hunt snapshot results frame"
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
        )}

        {!isShowingPhoto && !hasCameraError && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full z-10 pointer-events-none"
            aria-hidden="true"
          >
            <defs>
              <mask id="reticle-hole">
                <rect x="0" y="0" width="100" height="100" fill="white" />
                <rect x="44" y="44" width="12" height="12" fill="black" rx="2" ry="2" />
              </mask>
            </defs>
            <rect width="100" height="100" fill="rgba(0,0,0,0.5)" mask="url(#reticle-hole)" />
            <rect x="44" y="44" width="12" height="12" fill="transparent" stroke="#ffffff" strokeWidth="1.5" rx="2" />
          </svg>
        )}

        {hasCameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 z-30">
            <span className="text-3xl mb-2">🛑</span>
            <h4 className="text-sm font-black uppercase text-slate-200 tracking-wider">Camera Permissions Blocked</h4>
            <p className="text-xs text-slate-500 mt-2 max-w-[280px] leading-relaxed">
              Please grant camera access or authorize the stream inside your browser settings!
            </p>
          </div>
        )}
      </div>

      <div className="w-full flex flex-col gap-3 px-1">
        {!isLockedToday && !hasCameraError && (
          <button
            onClick={handleCapturePhotoAction}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all tracking-wide text-base active:scale-95"
          >
            📷 Take Photo
          </button>
        )}

        {!isLockedToday && !hasCameraError && (
          <button
            onClick={() => setFlashOn((prev) => !prev)}
            type="button"
            disabled={!supportsTorch}
            className={`w-full py-2.5 ${supportsTorch ? "bg-amber-500/15 hover:bg-amber-500/25 text-amber-200" : "bg-slate-800 text-slate-500 cursor-not-allowed"} border border-slate-800 rounded-xl text-xs font-bold transition-all tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95`}
          >
            {flashOn ? "⚡ Flash On" : "⚡ Flash Off"}
          </button>
        )}

        {!isShowingPhoto && !hasCameraError && (
          <button
            onClick={handleToggleLensFacing}
            type="button"
            className="w-full py-2.5 bg-white/10 hover:bg-white/10 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm select-none active:scale-95"
          >
            {facingMode === "environment" ? "🔄 Switch to Front Camera" : "🔄 Switch to Back Camera"}
          </button>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}