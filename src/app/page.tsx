"use client";

import { useEffect, useState } from "react";
import Viewfinder from "../components/Viewfinder";
import Scoreboard from "../components/Scoreboard";
import { DailyColour } from "../types";

export default function Home() {
  const [activeTarget, setActiveTarget] = useState<DailyColour | null>(null);
  const [playerHex, setPlayerHex] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [gameMessage, setGameMessage] = useState<string>("Aim and take your Photo!");
  const [messageColor, setMessageColor] = useState<string>("text-slate-400");


  // Game tracking metrics
  const [isLockedToday, setIsLockedToday] = useState<boolean>(false);
  const [savedPhoto, setSavedPhoto] = useState<string>("");
  const [attempts, setAttempts] = useState<number>(0);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [shareCopied, setShareCopied] = useState<boolean>(false);
  const [historyBlocks, setHistoryBlocks] = useState<string[]>([]);
  const [previewText, setPreviewText] = useState<string>("");

  const getDailyStorageKey = () => {
    const d = new Date();
    return `colour-hunter-game-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  useEffect(() => {
    async function loadDailyChallenge() {
      try {
        const response = await fetch("/api/today");
        if (!response.ok) throw new Error("Network transaction failed.");

        const data: DailyColour = await response.json();
        setActiveTarget(data);

        const storageKey = getDailyStorageKey();
        const savedSessionData = localStorage.getItem(storageKey);

        if (savedSessionData) {
          const parsedSession = JSON.parse(savedSessionData);

          setAttempts(parsedSession.attempts || 0);

          const blocks = parsedSession.historyBlocks || [];
          setHistoryBlocks(blocks);

          // If they previously unlocked a win code for today, trigger a strict lock
          if (parsedSession.isVictory) {
            setPlayerHex(parsedSession.playerHex);
            setSavedPhoto(parsedSession.photoDataUrl);
            setFinalScore(parsedSession.score);
            setIsLockedToday(true);
            setGameMessage(`🎯 Complete! Match found in ${parsedSession.attempts} Photos!`);
            setMessageColor("text-emerald-400 font-bold");
          } else {
            setGameMessage(`Keep hunting! Photos taken: ${parsedSession.attempts}`);
            setMessageColor("text-amber-400 font-medium");
          }
        }
      } catch (err) {
        console.error("Initialization pipeline crash:", err);
        setGameMessage("Could not synchronise game state parameters.");
        setMessageColor("text-rose-500");
      } finally {
        setIsLoading(false);
      }
    }

    loadDailyChallenge();
  }, []);

  const generateShareText = (totalShots: number, finalAccuracy: number, target: DailyColour, blocks: string[]) => {
    const blockGrid = blocks.join("\n");
    const text = `Colour Hunter\nPhotos Taken: ${totalShots}\nAccuracy: ${finalAccuracy}%\nTarget: ${target.name} (${target.hex})\n\n${blockGrid}\n\nPlay at: ${window.location.origin}`;
    setPreviewText(text);
  };

  const handlePhotoCaptured = (score: number, detectedColour: string, photoDataUrl: string) => {
    // Increment photo submission counter
    const newAttemptCount = attempts + 1;
    setAttempts(newAttemptCount);
    setPlayerHex(detectedColour);


    let currentShotBlock = `🟥 ${newAttemptCount}: ${score}%`;
    if (score >= 80) currentShotBlock = `🟩 ${newAttemptCount}: ${score}%`;
    else if (score >= 60) currentShotBlock = `🟨 ${newAttemptCount}: ${score}%`;

    const updatedBlocks = [...historyBlocks, currentShotBlock];
    setHistoryBlocks(updatedBlocks);

    const isVictoryMatch = score >= 80;
    const storageKey = getDailyStorageKey();

    const sessionPayload = {
      score,
      playerHex: detectedColour,
      photoDataUrl: isVictoryMatch ? photoDataUrl : "",
      attempts: newAttemptCount,
      isVictory: isVictoryMatch,
      historyBlocks: updatedBlocks,
      completedAt: new Date().toISOString()
    };
    localStorage.setItem(storageKey, JSON.stringify(sessionPayload));

    if (isVictoryMatch) {
      // Lock the game only if target threshold met
      setSavedPhoto(photoDataUrl);
      setFinalScore(score);
      setIsLockedToday(true);
      setGameMessage(`🎯 Perfect Match! ${score}% Similarity!`);
      setMessageColor("text-emerald-400 font-extrabold");

      if (activeTarget) {
        generateShareText(newAttemptCount, score, activeTarget, updatedBlocks);
      }
    } else {
      setGameMessage(`❌ Only a ${score}% Match — Try Again!`);
      setMessageColor("text-rose-400 font-semibold");
    }
  };

  const handleReset = () => {
    setPlayerHex(null);
    setGameMessage(`Aim and take your photo! (Photos taken: ${attempts})`);
    setMessageColor("text-slate-400 font-normal");
  };

  const handleCopyClipboard = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    } catch (err) {
      console.error("Clipboard copy failure:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading Game States...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-50 p-4 antialiased">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-black text-white tracking-wider mb-0.5">
          Colour Hunter
        </h1>
        <p className="text-[20px] font-bold text-slate-500 tracking-widest">
          Daily Colour
        </p>
      </div>

      {/*Scoreboard Component */}
      <Scoreboard activeTarget={activeTarget} playerHex={playerHex} />

      {/* Activity Banner */}
      <div className={`text-center text-lg mb-6 min-h-[28px] max-w-[340px] tracking-wide transition-all duration-300 ease-out ${messageColor}`}>
        {gameMessage}
      </div>

      {/* Victory and Share Card */}
      {isLockedToday && (
        <div className="w-full max-w-[400px] mb-6 p-5 bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col items-center animate-fade-in z-20">
          <h3 className="text-xs font-bold text-slate-400 tracking-widest mb-3">Share Your Results</h3>
          <button
            onClick={handleCopyClipboard}
            className={`w-full py-3 text-sm font-bold rounded-xl transition-all duration-300 shadow-lg tracking-wider mb-4 flex items-center justify-center gap-2 ${shareCopied
                ? "bg-emerald-600 text-white"
                : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white transform hover:-translate-y-0.5 active:translate-y-0"
              }`}
          >
            {shareCopied ? "✓ Copied!" : "📋 Copy Share Card"}
          </button>

          <div className="w-full text-left bg-slate-950 p-4 rounded-xl shadow-inner">
            <p className="text-[10px] font-bold text-slate-500 tracking-widest mb-2 pb-1">Clipboard Preview</p>
            <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {previewText}
            </pre>
          </div>
        </div>
      )}

      <Viewfinder
        activeTarget={activeTarget}
        onPhotoCaptured={handlePhotoCaptured}
        isLockedToday={isLockedToday}
        savedPhoto={savedPhoto}
        onReset={handleReset}
      />
    </main>
  );
}