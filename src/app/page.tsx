// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Viewfinder from "../components/Viewfinder";
import Scoreboard from "../components/Scoreboard";
import { DailyColour } from "../types";

interface GameStats {
  daysComplete: number;
  easyWins: number;
  hardWins: number;
  totalAttempts: number;
  successRate: number;
}

export default function Home() {
  const router = useRouter();

  const [gameMode, setGameMode] = useState<"daily" | "seeker">("daily");
  const [difficulty, setDifficulty] = useState<"normal" | "hard">("normal");

  const [activeTarget, setActiveTarget] = useState<DailyColour | null>(null);
  const [playerHex, setPlayerHex] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [gameMessage, setGameMessage] = useState<string>("Aim and take your Photo!");
  const [messageColor, setMessageColor] = useState<string>("text-slate-400");

  const [normalAttempts, setNormalAttempts] = useState<number>(0);
  const [hardAttempts, setHardAttempts] = useState<number>(0);
  const [normalHistory, setNormalHistory] = useState<string[]>([]);
  const [hardHistory, setHardHistory] = useState<string[]>([]);
  const [normalLocked, setNormalLocked] = useState<boolean>(false);
  const [hardLocked, setHardLocked] = useState<boolean>(false);
  const [normalSavedPhoto, setNormalSavedPhoto] = useState<string>("");
  const [hardSavedPhoto, setHardSavedPhoto] = useState<string>("");

  const [globalStats, setGlobalStats] = useState<GameStats>({
    daysComplete: 0,
    easyWins: 0,
    hardWins: 0,
    totalAttempts: 0,
    successRate: 0,
  });

  const [streak, setStreak] = useState<number>(0);
  const [previewText, setPreviewText] = useState<string>("");
  const [shareCopied, setShareCopied] = useState<boolean>(false);
  const [imageCopied, setImageCopied] = useState<boolean>(false);
  const [finalScore, setFinalScore] = useState<number>(0);

  const maxAttemptsAllowed = difficulty === "hard" ? 15 : 20;
  const currentAttempts = difficulty === "normal" ? normalAttempts : hardAttempts;
  const currentHistory = difficulty === "normal" ? normalHistory : hardHistory;
  const isLockedToday = difficulty === "normal" ? normalLocked : hardLocked;
  const savedPhoto = difficulty === "normal" ? normalSavedPhoto : hardSavedPhoto;

  const STATIC_STATS_KEY = "colour-hunter-global-stats-v2";
  const STATIC_STREAK_KEY = "colour-hunter-global-streak-v1";

  const getDailyStorageKey = (mode: "normal" | "hard") => {
    const d = new Date();
    return `colour-hunter-game-${mode}-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  const getFormattedDate = () => {
    return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };

  const parseDatasetModeColor = async (modeSelection: "normal" | "hard") => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/today");
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API transaction failed with status ${response.status}: ${errorText}`);
      }

      const fullList: DailyColour[] = await response.json();

      const filteredPool = fullList.filter((_, index) =>
        modeSelection === "normal" ? index % 2 !== 0 : index % 2 === 0
      );

      if (filteredPool.length === 0) {
        throw new Error("Filtered color pool generated an empty array matrix.");
      }

      const dayIndex = new Date().getDate() % filteredPool.length;
      const selectedColor = filteredPool[dayIndex];
      setActiveTarget(selectedColor);

      const storageKey = getDailyStorageKey(modeSelection);
      const savedSessionData = localStorage.getItem(storageKey);
      const limitCap = modeSelection === "hard" ? 15 : 20;

      if (savedSessionData) {
        const parsed = JSON.parse(savedSessionData);
        if (modeSelection === "normal") {
          setNormalAttempts(parsed.attempts || 0);
          setNormalHistory(parsed.historyBlocks || []);
          setNormalLocked(parsed.isLocked || false);
          setNormalSavedPhoto(parsed.photoDataUrl || "");
        } else {
          setHardAttempts(parsed.attempts || 0);
          setHardHistory(parsed.historyBlocks || []);
          setHardLocked(parsed.isLocked || false);
          setHardSavedPhoto(parsed.photoDataUrl || "");
        }

        setFinalScore(parsed.score || 0);

        if (parsed.isVictory) {
          setPlayerHex(parsed.playerHex);
          setGameMessage(`🎯 Complete! Match found in ${parsed.attempts} Photos!`);
          setMessageColor("text-emerald-400 font-bold");
        } else if ((parsed.attempts || 0) >= limitCap) {
          setPlayerHex(parsed.playerHex || null);
          setGameMessage(`❌ Game Over! Out of attempts (${parsed.attempts}/${limitCap})!`);
          setMessageColor("text-rose-500 font-bold");
        } else {
          setPlayerHex(null);
          setGameMessage(`Keep hunting! Photos taken: ${parsed.attempts}/${limitCap}`);
          setMessageColor("text-amber-400 font-medium");
        }
      } else {
        if (modeSelection === "normal") {
          setNormalAttempts(0);
          setNormalHistory([]);
          setNormalLocked(false);
          setNormalSavedPhoto("");
        } else {
          setHardAttempts(0);
          setHardHistory([]);
          setHardLocked(false);
          setHardSavedPhoto("");
        }
        setPlayerHex(null);
        setFinalScore(0);
        setGameMessage("Aim and take your Photo!");
        setMessageColor("text-slate-400");
      }
    } catch (err) {
      console.error("Failed to map color indices:", err);
      setGameMessage("Error loading color dataset.");
      setMessageColor("text-rose-500");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedStats = localStorage.getItem(STATIC_STATS_KEY);
    if (savedStats) setGlobalStats(JSON.parse(savedStats));

    const savedStreakRaw = localStorage.getItem(STATIC_STREAK_KEY);
    let activeStreak = 0;
    if (savedStreakRaw) {
      const streakData = JSON.parse(savedStreakRaw);
      const lastWinDate = new Date(streakData.lastWinTimestamp);
      const now = new Date();
      if (Math.floor((now.getTime() - lastWinDate.getTime()) / (1000 * 3600 * 24)) <= 1) {
        activeStreak = streakData.streakCount || 0;
      }
    }
    setStreak(activeStreak);
    parseDatasetModeColor(difficulty);
  }, [difficulty]);

  // Dynamic share code engine block generator
  useEffect(() => {
    if (isLockedToday && activeTarget && currentHistory.length > 0) {
      const currentDateString = getFormattedDate();
      let chunkedGrid = "";
      for (let i = 0; i < currentHistory.length; i += 5) {
        chunkedGrid += currentHistory.slice(i, i + 5).join(" ") + "\n";
      }
      const scoreOutputLabel = finalScore >= 80 ? `${finalScore}%` : "Failed (Max Photos Taken)";
      const text = `🎯 Colour Hunter • ${currentDateString} • ${activeTarget.name} (${activeTarget.hex.toUpperCase()})\n🔥 ${streak} Day Streak • ${currentAttempts}/${maxAttemptsAllowed} Photos [Mode: ${gameMode.toUpperCase()} - ${difficulty.toUpperCase()}]\n🏆 Final Accuracy: ${scoreOutputLabel} [${playerHex ? playerHex.toUpperCase() : ""}]\n\n${chunkedGrid.trim()}\n\nhttps://colour-hunter.vercel.app/`;
      setPreviewText(text);
    }
  }, [isLockedToday, activeTarget, currentHistory, currentAttempts, finalScore, streak, playerHex, difficulty, maxAttemptsAllowed, gameMode]);

  const updateGlobalStatsProfile = (wonMode: "normal" | "hard" | null, attemptAdded: boolean) => {
    setGlobalStats((prev) => {
      const nextDaysComplete = wonMode ? prev.daysComplete + 1 : prev.daysComplete;
      const nextTotalAttempts = attemptAdded ? prev.totalAttempts + 1 : prev.totalAttempts;

      const next = {
        daysComplete: nextDaysComplete,
        easyWins: wonMode === "normal" ? prev.easyWins + 1 : prev.easyWins,
        hardWins: wonMode === "hard" ? prev.hardWins + 1 : prev.hardWins,
        totalAttempts: nextTotalAttempts,
        successRate: nextTotalAttempts > 0 ? Math.round((nextDaysComplete / nextTotalAttempts) * 100) : 0
      };
      localStorage.setItem(STATIC_STATS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleRestartDayAction = () => {
    const confirmWipe = window.confirm(`Reset today's progress for ${difficulty.toUpperCase()} mode?`);
    if (!confirmWipe) return;

    localStorage.removeItem(getDailyStorageKey(difficulty));
    if (difficulty === "normal") {
      setNormalAttempts(0);
      setNormalHistory([]);
      setNormalLocked(false);
      setNormalSavedPhoto("");
    } else {
      setHardAttempts(0);
      setHardHistory([]);
      setHardLocked(false);
      setHardSavedPhoto("");
    }
    setPlayerHex(null);
    setFinalScore(0);
    setGameMessage("Aim and take your Photo!");
    setMessageColor("text-slate-400");
    parseDatasetModeColor(difficulty);
  };

  const handleReset = () => {
    setPlayerHex(null);
    setGameMessage(`Aim and take your Photo! (Photos taken: ${currentAttempts}/${maxAttemptsAllowed})`);
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
        new ClipboardItem({ [imageBlob.type]: imageBlob })
      ]);
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 3000);
    } catch (error) {
      console.error("Image clipboard copying failed:", error);
    }
  };

  const handlePhotoCaptured = (score: number, detectedColour: string, photoDataUrl: string) => {
    if (currentAttempts >= maxAttemptsAllowed || isLockedToday) return;

    const newCount = currentAttempts + 1;
    let currentShotBlock = `🟥${score}%`;
    if (score >= 80) currentShotBlock = `🟩${score}%`;
    else if (score >= 60) currentShotBlock = `🟨${score}%`;

    const updatedBlocks = [...currentHistory, currentShotBlock];
    const isVictoryMatch = score >= 80;
    const isOutOfAttempts = newCount >= maxAttemptsAllowed;
    const shouldLockGame = isVictoryMatch || isOutOfAttempts;

    if (difficulty === "normal") {
      setNormalAttempts(newCount);
      setNormalHistory(updatedBlocks);
      if (shouldLockGame) {
        setNormalLocked(true);
        setNormalSavedPhoto(photoDataUrl);
      }
    } else {
      setHardAttempts(newCount);
      setHardHistory(updatedBlocks);
      if (shouldLockGame) {
        setHardLocked(true);
        setHardSavedPhoto(photoDataUrl);
      }
    }

    setPlayerHex(detectedColour);
    setFinalScore(isVictoryMatch ? score : 0);
    updateGlobalStatsProfile(isVictoryMatch ? difficulty : null, true);

    localStorage.setItem(getDailyStorageKey(difficulty), JSON.stringify({
      score: isVictoryMatch ? score : 0,
      playerHex: detectedColour,
      photoDataUrl: shouldLockGame ? photoDataUrl : "",
      attempts: newCount,
      isVictory: isVictoryMatch,
      isLocked: shouldLockGame,
      historyBlocks: updatedBlocks,
    }));

    if (isVictoryMatch) {
      setGameMessage(`🎯 Perfect Match! ${score}% Similarity!`);
      setMessageColor("text-emerald-400 font-extrabold");
    } else if (isOutOfAttempts) {
      setGameMessage(`❌ Game Over! Out of attempts (${newCount}/${maxAttemptsAllowed})!`);
      setMessageColor("text-rose-500 font-bold");
    } else {
      setGameMessage(`❌ Only a ${score}% Match — Try Again!`);
      setMessageColor("text-rose-400 font-semibold");
      setTimeout(() => {
        handleReset();
      }, 2000);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-50 p-4 pb-12 antialiased">
      {/* Header Profile Section */}
      <div className="w-full max-w-[400px] flex items-center justify-between mb-4 px-1">
        <div>
          <h1 className="text-3xl font-black text-white tracking-wider leading-none">Colour Hunter</h1>
          <p className="text-[14px] font-bold text-slate-500 tracking-widest mt-1">
            {gameMode === "daily" ? "Daily Mode" : "Hex Seeker Mode"}
          </p>
        </div>
        <div className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-black rounded-xl select-none">
          🔥 <span className="font-mono text-sm leading-none">{streak}</span>
        </div>
      </div>

      {/* Tracker Scoreboard Cards */}
      <div className="w-full max-w-[400px] grid grid-cols-4 gap-2 mb-5 text-center">
        <div className="bg-slate-900/60 p-2.5 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-500 tracking-tight">Days Done</p>
          <p className="text-lg font-black text-white mt-0.5">{globalStats.daysComplete}</p>
        </div>
        <div className="bg-slate-900/60 p-2.5 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-500 tracking-tight">Easy Wins</p>
          <p className="text-lg font-black text-blue-400 mt-0.5">{globalStats.easyWins}</p>
        </div>
        <div className="bg-slate-900/60 p-2.5 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-500 tracking-tight">Hard Wins</p>
          <p className="text-lg font-black text-purple-400 mt-0.5">{globalStats.hardWins}</p>
        </div>
        <div className="bg-slate-900/60 p-2.5 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-500 tracking-tight">Success %</p>
          <p className="text-lg font-black text-emerald-400 mt-0.5">{globalStats.successRate}%</p>
        </div>
      </div>

      {/* Game Mode Dashboard*/}
      <div className="w-full max-w-[400px] grid grid-cols-2 p-1.5 bg-slate-900 rounded-2xl mb-4 text-sm font-black tracking-wider">
        <button
          onClick={() => setGameMode("daily")}
          className={`py-[14px] rounded-xl transition-all ${gameMode === "daily" ? "bg-slate-800 text-white shadow-md border border-slate-700" : "text-slate-400 hover:text-slate-200"}`}
        >
          📅 Daily Mode
        </button>
        <button
          onClick={() => setGameMode("seeker")}
          className={`py-[14px] rounded-xl transition-all ${gameMode === "seeker" ? "bg-slate-800 text-white shadow-md border border-slate-700" : "text-slate-400 hover:text-slate-200"}`}
        >
          🔎 Hex Seeker
        </button>
      </div>

      {/* Difficulty Selector Row */}
      <div className="w-full max-w-[400px] grid grid-cols-2 p-1.5 bg-slate-900 rounded-2xl mb-5 text-sm font-black tracking-wider">
        <button
          onClick={() => setDifficulty("normal")}
          className={`py-[14px] rounded-xl transition-all ${difficulty === "normal" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
        >
          📘 Normal
        </button>
        <button
          onClick={() => setDifficulty("hard")}
          className={`py-[14px] rounded-xl transition-all ${difficulty === "hard" ? "bg-purple-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
        >
          🧠  Hard
        </button>
      </div>
      {isLoading ? (
        <div className="h-[200px] flex items-center justify-center">
          <div className="w-8 h-8 animate-spin border-2 border-t-transparent border-white rounded-full" />
        </div>
      ) : (
        <>
          {gameMode === "daily" ? (
            <Scoreboard activeTarget={activeTarget} playerHex={playerHex} />
          ) : (
            <div className="w-full max-w-[400px] grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-900 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[140px] shadow-lg">
                <span className="text-[10px] font-bold text-slate-500 tracking-widest">Your Colour</span>
                <div
                  className="w-12 h-12 rounded-xl mt-3 shadow-inner"
                  style={{ backgroundColor: playerHex || "#1e293b" }}
                />
                <span className="text-xs font-mono font-black mt-2 text-slate-300">{playerHex || "#------"}</span>
              </div>

              <div className="bg-slate-900 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[140px] shadow-lg text-center">
                <span className="text-[10px] font-bold text-slate-500 tracking-widest">Navigation Logs</span>
                <div className="w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center mt-3 text-sm">📡</div>
                <span className="text-[11px] font-bold text-slate-400 mt-2 leading-tight">Waiting for first scan...</span>
              </div>
            </div>
          )}

          {/* Share panel */}
          {isLockedToday && (
            <div className="w-full max-w-[400px] mb-6 p-5 bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col items-center z-20">
              <h3 className="text-xs font-bold text-slate-400 tracking-widest mb-4 uppercase">Share Your Results</h3>
              <div className="grid grid-cols-2 gap-3 w-full mb-4">
                <button onClick={handleCopyClipboard} className="py-[14px] px-2 text-sm font-black rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white transition-all active:scale-95 cursor-pointer">
                  {shareCopied ? "✓ Text Copied!" : "📋 Copy Score Text"}
                </button>
                <button onClick={handleCopyImageToClipboard} className="py-[14px] px-2 text-sm font-black rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white transition-all active:scale-95 cursor-pointer">
                  {imageCopied ? "✓ Photo Copied!" : "📸 Copy Victory Photo"}
                </button>
              </div>
              <div className="w-full text-left bg-slate-950 p-4 rounded-xl">
                <p className="text-[10px] font-bold text-slate-500 tracking-widest mb-2 pb-1 border-b border-slate-900/40 uppercase">Clipboard Preview</p>
                <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">{previewText}</pre>
              </div>
            </div>
          )}

          <div className={`text-center text-lg mb-6 min-h-[28px] max-w-[340px] tracking-wide transition-all duration-300 ${messageColor}`}>
            {gameMessage}
          </div>

          <Viewfinder
            activeTarget={activeTarget}
            onPhotoCaptured={handlePhotoCaptured}
            isLockedToday={isLockedToday}
            savedPhoto={savedPhoto}
            onReset={handleReset}
            difficulty={difficulty}
          />

          {currentAttempts > 0 && (
            <button
              onClick={handleRestartDayAction}
              className="mt-6 text-[11px] py-[14px] font-black tracking-widest text-rose-500/70 hover:text-rose-400 hover:underline transition-all cursor-pointer"
            >
              ⚠️ Restart Today ({difficulty.toUpperCase()})
            </button>
          )}
        </>
      )}
    </main>
  );
}