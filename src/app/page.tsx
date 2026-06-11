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
  const [imageCopied, setImageCopied] = useState<boolean>(false);

  // Game state analytics
  const [historyBlocks, setHistoryBlocks] = useState<string[]>([]);
  const [previewText, setPreviewText] = useState<string>("");
  const [streak, setStreak] = useState<number>(0);

  const getDailyStorageKey = () => {
    const d = new Date();
    return `colour-hunter-game-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  const STATIC_STREAK_KEY = "colour-hunter-global-streak-v1";

  const getFormattedDate = () => {
    return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };

  useEffect(() => {
    async function loadDailyChallenge() {
      try {
        const response = await fetch("/api/today");
        if (!response.ok) throw new Error("Network transaction failed.");

        const data: DailyColour = await response.json();
        setActiveTarget(data);

        const savedStreakRaw = localStorage.getItem(STATIC_STREAK_KEY);
        let activeStreak = 0;

        if (savedStreakRaw) {
          const streakData = JSON.parse(savedStreakRaw);
          const lastWinDate = new Date(streakData.lastWinTimestamp);
          const now = new Date();

          const lastWinMidnight = new Date(lastWinDate.getFullYear(), lastWinDate.getMonth(), lastWinDate.getDate());
          const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

          const timeDiff = todayMidnight.getTime() - lastWinMidnight.getTime();
          const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

          if (dayDiff <= 1) {
            activeStreak = streakData.streakCount || 0;
          } else {
            activeStreak = 0;
            localStorage.setItem(STATIC_STREAK_KEY, JSON.stringify({ streakCount: 0, lastWinTimestamp: "" }));
          }
        }
        setStreak(activeStreak);

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

  useEffect(() => {
    if (isLockedToday && activeTarget && historyBlocks.length > 0) {
      const currentDateString = getFormattedDate();

      // Groups sqaures into 5
      let chunkedGrid = "";
      for (let i = 0; i < historyBlocks.length; i += 5) {
        const lineChunk = historyBlocks.slice(i, i + 5).join(" ");
        chunkedGrid += lineChunk + "\n";
      }
      const text = `🎯 Colour Hunter • ${currentDateString} • ${activeTarget.name} (${activeTarget.hex.toUpperCase()})\n🔥 ${streak} Day Streak • ${attempts} Shots\n🏆 Final Accuracy: ${finalScore}% [${playerHex ? playerHex.toUpperCase() : ""}]\n\n${chunkedGrid.trim()}\n\nhttps://colour-hunter.vercel.app/`;

      setPreviewText(text);
    }
  }, [isLockedToday, activeTarget, historyBlocks, attempts, finalScore, streak, playerHex]);

  const handlePhotoCaptured = (score: number, detectedColour: string, photoDataUrl: string) => {
    // Increment photo submission counter
    const newAttemptCount = attempts + 1;
    setAttempts(newAttemptCount);
    setPlayerHex(detectedColour);

    let currentShotBlock = `🟥${score}%`;
    if (score >= 80) currentShotBlock = `🟩${score}%`;
    else if (score >= 60) currentShotBlock = `🟨${score}%`;

    const updatedBlocks = [...historyBlocks, currentShotBlock];
    setHistoryBlocks(updatedBlocks);

    const isVictoryMatch = score >= 80;
    const storageKey = getDailyStorageKey();

    let runningStreak = streak;
    if (isVictoryMatch && !isLockedToday) {
      const savedStreakRaw = localStorage.getItem(STATIC_STREAK_KEY);
      let prevCount = 0;
      let hasWonTodayAlready = false;

      if (savedStreakRaw) {
        const parsedStreak = JSON.parse(savedStreakRaw);
        prevCount = parsedStreak.streakCount || 0;

        if (parsedStreak.lastWinTimestamp) {
          const lastWin = new Date(parsedStreak.lastWinTimestamp);
          const now = new Date();
          if (lastWin.getFullYear() === now.getFullYear() &&
            lastWin.getMonth() === now.getMonth() &&
            lastWin.getDate() === now.getDate()) {
            hasWonTodayAlready = true;
          }
        }
      }

      if (!hasWonTodayAlready) {
        runningStreak = prevCount + 1;
        setStreak(runningStreak);
        localStorage.setItem(STATIC_STREAK_KEY, JSON.stringify({
          streakCount: runningStreak,
          lastWinTimestamp: new Date().toISOString()
        }));
      }
    }

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

  const handleCopyImageToClipboard = async () => {
    if (!savedPhoto) return;

    try {
      const base64Response = await fetch(savedPhoto);
      const imageBlob = await base64Response.blob();

      await navigator.clipboard.write([
        new ClipboardItem({
          [imageBlob.type]: imageBlob
        })
      ]);

      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 3000);
    } catch (error) {
      console.error("Image clipboard copying falied:", error);
      alert("Your browser or device does not support copying image to clipboard. You can long-press the image to save manually!");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-50 p-4 antialiased">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-[400px] mb-5 px-1">
        <div className="flex flex-col text-left">
          <h1 className="text-3xl font-black text-white tracking-wider leading-none">
            Colour Hunter
          </h1>
          <p className="text-[10px] font-bold text-slate-500  tracking-widest mt-1">
            Daily Mode
          </p>
        </div>

        <div className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 shrink-0 select-none">
          🔥 <span className="font-mono text-sm leading-none">{streak}</span>
        </div>
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

          <div className="grid grid-cols-2 gap-3 w-full mb-4">
            <button
              onClick={handleCopyClipboard}
              className={`py-3 px-2 text-xs font-black rounded-xl transition-all duration-300 shadow-md tracking-wider flex items-center justify-center gap-1.5 ${shareCopied
                  ? "bg-emerald-600 text-white shadow-emerald-900/30"
                  : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white transform hover:-translate-y-0.5 active:translate-y-0"
                }`}
            >
              {shareCopied ? "✓ Text Copied!" : "📋 Copy Score Text"}
            </button>

            <button
              onClick={handleCopyImageToClipboard}
              className={`py-3 px-2 text-xs font-black rounded-xl transition-all duration-300 shadow-md tracking-wider flex items-center justify-center gap-1.5 ${imageCopied
                  ? "bg-emerald-600 text-white shadow-emerald-900/30"
                  : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white transform hover:-translate-y-0.5 active:translate-y-0"
                }`}
            >
              {imageCopied ? "✓ Photo Copied!" : "📸 Copy Victory Photo"}
            </button>
          </div>

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