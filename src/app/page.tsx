"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Viewfinder from "../components/Viewfinder";
import Scoreboard from "../components/Scoreboard";
import { DailyColour } from "../types";
import { generateSeekerHint } from "../lib/colourMath";

interface GameStats {
  daysComplete: number;
  easyWins: number;
  hardWins: number;
  totalAttempts: number;
  successRate: number;
}

export default function Home() {
  const router = useRouter();

  // GLobal State
  const [gameMode, setGameMode] = useState<"daily" | "seeker">("daily");
  const [difficulty, setDifficulty] = useState<"normal" | "hard">("normal");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [gameMessage, setGameMessage] = useState<string>("Aim and take your Photo!");
  const [messageColor, setMessageColor] = useState<string>("text-slate-400");
  const [finalScore, setFinalScore] = useState<number>(0);

  // Daily Mode State
  const [activeTarget, setActiveTarget] = useState<DailyColour | null>(null);
  const [dailyPlayerHex, setDailyPlayerHex] = useState<string | null>(null);
  const [normalAttempts, setNormalAttempts] = useState<number>(0);
  const [hardAttempts, setHardAttempts] = useState<number>(0);
  const [normalHistory, setNormalHistory] = useState<string[]>([]);
  const [hardHistory, setHardHistory] = useState<string[]>([]);
  const [normalLocked, setNormalLocked] = useState<boolean>(false);
  const [hardLocked, setHardLocked] = useState<boolean>(false);
  const [normalSavedPhoto, setNormalSavedPhoto] = useState<string>("");
  const [hardSavedPhoto, setHardSavedPhoto] = useState<string>("");

  // Hex Seaker State
  const [colourDatabase, setColourDatabase] = useState<DailyColour[]>([]);
  const [seekerTarget, setSeekerTarget] = useState<DailyColour | null>(null);
  const [seekerPlayerHex, setSeekerPlayerHex] = useState<string | null>(null);
  const [seekerAttempts, setSeekerAttempts] = useState<number>(0);
  const [seekerHistory, setSeekerHistory] = useState<string[]>([]);
  const [isSeekerVictory, setIsSeekerVictory] = useState<boolean>(false);
  const [seekerHint, setSeekerHint] = useState<string>("Waiting for first photo...");
  const [seekerSavedPhoto, setSeekerSavedPhoto] = useState<string>("");

  // Stats and Sharing
  const [globalStats, setGlobalStats] = useState<GameStats>({
    daysComplete: 0, easyWins: 0, hardWins: 0, totalAttempts: 0, successRate: 0,
  });
  const [streak, setStreak] = useState<number>(0);
  const [previewText, setPreviewText] = useState<string>("");
  const [shareCopied, setShareCopied] = useState<boolean>(false);
  const [imageCopied, setImageCopied] = useState<boolean>(false);
  const [seekerPreviewText, setSeekerPreviewText] = useState<string>("");

  const maxAttemptsAllowed = difficulty === "hard" ? 15 : 20;
  const currentAttempts = difficulty === "normal" ? normalAttempts : hardAttempts;
  const currentHistory = difficulty === "normal" ? normalHistory : hardHistory;
  const isLockedToday = difficulty === "normal" ? normalLocked : hardLocked;
  const currentDailySavedPhoto = difficulty === "normal" ? normalSavedPhoto : hardSavedPhoto;
  const playerHex = gameMode === "daily" ? dailyPlayerHex : seekerPlayerHex;

  const STATIC_STATS_KEY = "colour-hunter-global-stats-v2";
  const STATIC_STREAK_KEY = "colour-hunter-global-streak-v1";

  const activePreviewText = gameMode === "daily" ? previewText : seekerPreviewText;
  const activeSavedPhoto = gameMode === "daily" ? currentDailySavedPhoto : seekerSavedPhoto;

  const getDailyStorageKey = (mode: "normal" | "hard") => {
    const d = new Date();
    return `colour-hunter-game-${mode}-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  const getFormattedDate = () => {
    return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };

  const parseCSVLine = (line: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') inQuotes = !inQuotes;
      else if (line[i] === ',' && !inQuotes) { result.push(current); current = ''; }
      else current += line[i];
    }
    result.push(current);
    return result;
  };

  useEffect(() => {
    const loadSharedGameData = async () => {
      try {
        setIsLoading(true);

        const response = await fetch('/data/color_names.csv');
        if (!response.ok) throw new Error("Failed to load CSV Database");
        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim() !== '');

        const parsedColours: DailyColour[] = lines.slice(1).map(line => {
          const parts = parseCSVLine(line);
          return {
            name: parts[0].trim(),
            hex: parts[1].replace(/[^a-zA-Z0-9#]/g, ''),
            r: parseInt(parts[2], 10),
            g: parseInt(parts[3], 10),
            b: parseInt(parts[4], 10)
          };
        }).filter(c => !isNaN(c.r) && c.name);

        setColourDatabase(parsedColours);

        // Daily Target
        const filteredPool = parsedColours.filter((_, index) =>
          difficulty === "normal" ? index % 2 !== 0 : index % 2 === 0
        );

        const now = new Date();
        const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        const dayIndex = dayOfYear % filteredPool.length;
        const dailyColor = filteredPool[dayIndex];

        setActiveTarget(dailyColor);

        const storageKey = getDailyStorageKey(difficulty);
        const savedSessionData = localStorage.getItem(storageKey);
        const limitCap = difficulty === "hard" ? 15 : 20;

        if (savedSessionData) {
          const parsed = JSON.parse(savedSessionData);
          if (difficulty === "normal") {
            setNormalAttempts(parsed.attempts || 0); setNormalHistory(parsed.historyBlocks || []); setNormalLocked(parsed.isLocked || false); setNormalSavedPhoto(parsed.photoDataUrl || "");
          } else {
            setHardAttempts(parsed.attempts || 0); setHardHistory(parsed.historyBlocks || []); setHardLocked(parsed.isLocked || false); setHardSavedPhoto(parsed.photoDataUrl || "");
          }
          setFinalScore(parsed.score || 0);

          if (parsed.isVictory) {
            setDailyPlayerHex(parsed.playerHex);
            setGameMessage(`🎯 Complete! Match found in ${parsed.attempts} Photos!`);
            setMessageColor("text-emerald-400 font-bold");
          } else if ((parsed.attempts || 0) >= limitCap) {
            setDailyPlayerHex(parsed.playerHex || null);
            setGameMessage(`❌ Game Over! Out of attempts (${parsed.attempts}/${limitCap})!`);
            setMessageColor("text-rose-500 font-bold");
          } else {
            setDailyPlayerHex(null);
            setGameMessage(`Keep hunting! Photos taken: ${parsed.attempts}/${limitCap}`);
            setMessageColor("text-amber-400 font-medium");
          }
        } else {
          if (difficulty === "normal") { setNormalAttempts(0); setNormalHistory([]); setNormalLocked(false); setNormalSavedPhoto(""); }
          else { setHardAttempts(0); setHardHistory([]); setHardLocked(false); setHardSavedPhoto(""); }
          setDailyPlayerHex(null);
          setFinalScore(0);
          setGameMessage("Aim and take your Photo!");
          setMessageColor("text-slate-400");
        }

        // Setup Hex Seeker
        setSeekerTarget((prev) => {
          if (!prev) {
            const randomColor = parsedColours[Math.floor(Math.random() * parsedColours.length)];
            console.log(`[SEEKER MODE TARGET] Name: ${randomColor.name} | Hex: ${randomColor.hex}`);
            return randomColor;
          }
          return prev;
        });
      } catch (err) {
        setGameMessage("Error loading color dataset.");
        setMessageColor("text-rose-500");
      } finally {
        setIsLoading(false);
      }
    };

    loadSharedGameData();

    // Stats & Streak loading
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

  }, [difficulty]);

  const handleDifficultyChange = (selectedMode: "normal" | "hard") => {
    setDifficulty(selectedMode);

    if (colourDatabase.length > 0) {
      const randomColor = colourDatabase[Math.floor(Math.random() * colourDatabase.length)];
      setSeekerTarget(randomColor);
      setSeekerAttempts(0);
      setSeekerHistory([]);
      setIsSeekerVictory(false);
      setSeekerPlayerHex(null);
      setSeekerSavedPhoto("");
      setSeekerHint("Waiting for first photo...");

      if (gameMode === "seeker") {
        setGameMessage("Take your first photo to get a hint!");
        setMessageColor("text-slate-400");
      }
      console.log(`[NEW SEEKER TARGET (${selectedMode})] Name: ${randomColor.name} | Hex: ${randomColor.hex}`);
    }
  };

  const pickNewSeekerTarget = () => {
    if (colourDatabase.length === 0) return;
    const randomColor = colourDatabase[Math.floor(Math.random() * colourDatabase.length)];
    setSeekerTarget(randomColor);
    setSeekerAttempts(0);
    setSeekerHistory([]);
    setIsSeekerVictory(false);
    setSeekerPlayerHex(null);
    setSeekerSavedPhoto("");
    setSeekerHint("Waiting for first scan...");
    setGameMessage("Take your first blind photo to get a hint!");
    setMessageColor("text-slate-400");
    console.log(`[SEEKER MODE TARGET] Name: ${randomColor.name} | Hex: ${randomColor.hex}`);
  };

  // Handle Game Mode Switching Messages
  useEffect(() => {
    if (gameMode === "daily") {
      if (isLockedToday) {
        setGameMessage(`Match complete in ${currentAttempts} Photos!`);
        setMessageColor("text-emerald-400 font-bold");
      } else if (currentAttempts === 0) {
        setGameMessage(`Aim and take your Photo! (${currentAttempts}/${maxAttemptsAllowed})`);
        setMessageColor("text-slate-400");
      }
    } else {
      if (isSeekerVictory) {
        setGameMessage(`🎯 Target Found: ${seekerTarget?.name}!`);
        setMessageColor("text-emerald-400 font-extrabold");
      } else if (seekerAttempts === 0) {
        setGameMessage("Take your first blind photo to get a hint!");
        setMessageColor("text-slate-400");
      }
    }
  }, [gameMode]);

  const handlePhotoCaptured = (score: number, detectedColour: string, photoDataUrl: string, rawR: number, rawG: number, rawB: number) => {
    // Hex Seeker Logic
    if (gameMode === "seeker") {
      if (isSeekerVictory || !seekerTarget) return;
      const newAttempts = seekerAttempts + 1;

      let currentShotBlock = `🟥${score}%`;
      if (score >= 80) currentShotBlock = `🟩${score}%`;
      else if (score >= 60) currentShotBlock = `🟨${score}%`;

      setSeekerHistory([...seekerHistory, currentShotBlock]);
      setSeekerAttempts(newAttempts);
      setSeekerPlayerHex(detectedColour);
      setSeekerSavedPhoto(photoDataUrl);

      if (score >= 80) {
        setIsSeekerVictory(true);
        setGameMessage(`🎯 Target Found: ${seekerTarget.name}!`);
        setSeekerHint(`Perfect match found in ${newAttempts} shots!`);
        setMessageColor("text-emerald-400 font-extrabold");
      } else {
        const hint = generateSeekerHint(rawR, rawG, rawB, seekerTarget.r, seekerTarget.g, seekerTarget.b);
        setGameMessage(`${score}% Match. Keep hunting!`);
        setSeekerHint(hint);
        setMessageColor("text-amber-400 font-medium");
      }
      return;
    }

    // Daily Mode Logic
    const newCount = currentAttempts + 1;
    let currentShotBlock = `🟥${score}%`;
    if (score >= 80) currentShotBlock = `🟩${score}%`;
    else if (score >= 60) currentShotBlock = `🟨${score}%`;

    const updatedBlocks = [...currentHistory, currentShotBlock];
    const isVictoryMatch = score >= 80;
    const isOutOfAttempts = newCount >= maxAttemptsAllowed;
    const shouldLockGame = isVictoryMatch || isOutOfAttempts;

    if (difficulty === "normal") {
      setNormalAttempts(newCount); setNormalHistory(updatedBlocks);
      if (shouldLockGame) { setNormalLocked(true); setNormalSavedPhoto(photoDataUrl); }
    } else {
      setHardAttempts(newCount); setHardHistory(updatedBlocks);
      if (shouldLockGame) { setHardLocked(true); setHardSavedPhoto(photoDataUrl); }
    }

    setDailyPlayerHex(detectedColour);
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
      setGameMessage(`❌ Only a ${score}% Match — Try Again! (${newCount}/${maxAttemptsAllowed})`);
      setMessageColor("text-rose-400 font-semibold");
    }
  };

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
      setNormalAttempts(0); setNormalHistory([]); setNormalLocked(false); setNormalSavedPhoto("");
    } else {
      setHardAttempts(0); setHardHistory([]); setHardLocked(false); setHardSavedPhoto("");
    }
    setDailyPlayerHex(null);
    setFinalScore(0);

    setDifficulty((prev) => prev === "normal" ? "hard" : "normal");
    setTimeout(() => setDifficulty(difficulty), 50);
  };

  const handleReset = () => {
    if (!isLockedToday) {
      setDailyPlayerHex(null);
      setGameMessage(`Aim and take your Photo! (Photos taken: ${currentAttempts}/${maxAttemptsAllowed})`);
      setMessageColor("text-slate-400 font-normal");
    }
  };

  // Dynamic share code generator
  useEffect(() => {
    if (isLockedToday && activeTarget && currentHistory.length > 0) {
      const currentDateString = getFormattedDate();
      let chunkedGrid = "";
      for (let i = 0; i < currentHistory.length; i += 5) {
        chunkedGrid += currentHistory.slice(i, i + 5).join(" ") + "\n";
      }
      const scoreOutputLabel = finalScore >= 80 ? `${finalScore}%` : "Failed (Max Photos Taken)";
      const text = `🎯 Colour Hunter • ${currentDateString} • ${activeTarget.name} (${activeTarget.hex.toUpperCase()})\n🔥 ${streak} Day Streak • ${currentAttempts}/${maxAttemptsAllowed} Photos [Mode: ${gameMode.toUpperCase()} - ${difficulty.toUpperCase()}]\n🏆 Final Accuracy: ${scoreOutputLabel} [${dailyPlayerHex ? dailyPlayerHex.toUpperCase() : ""}]\n\n${chunkedGrid.trim()}\n\nhttps://colour-hunter.vercel.app/`;
      setPreviewText(text);
    }
  }, [isLockedToday, activeTarget, currentHistory, currentAttempts, finalScore, streak, dailyPlayerHex, difficulty, maxAttemptsAllowed, gameMode]);

  useEffect(() => {
    if (isSeekerVictory && seekerTarget && seekerHistory.length > 0) {
      let chunkedGrid = "";
      for (let i = 0; i < seekerHistory.length; i += 5) {
        chunkedGrid += seekerHistory.slice(i, i + 5).join(" ") + "\n";
      }

      const text = `🔎 Colour Hunter • Hex Seeker\n🎯 Target: ${seekerTarget.name} (${seekerTarget.hex.toUpperCase()})\n📸 Shots Taken: ${seekerAttempts} [Mode: ${difficulty.toUpperCase()}]\n🏆 Final Match: ${seekerPlayerHex ? seekerPlayerHex.toUpperCase() : ""}\n\n${chunkedGrid.trim()}\n\nhttps://colour-hunter.vercel.app/`;
      setSeekerPreviewText(text);
    }
  }, [isSeekerVictory, seekerTarget, seekerAttempts, seekerPlayerHex, difficulty, seekerHistory]);

  const handleCopyClipboard = async () => {
    try {
      await navigator.clipboard.writeText(activePreviewText);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    } catch (err) { }
  };

  const handleCopyImageToClipboard = async () => {
    if (!activeSavedPhoto) return;
    try {
      const base64Response = await fetch(activeSavedPhoto);
      const imageBlob = await base64Response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [imageBlob.type]: imageBlob })]);
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 3000);
    } catch (error) { }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-50 p-4 pb-12 antialiased">
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

      <div className="w-full max-w-[400px] grid grid-cols-2 p-1.5 bg-slate-900 rounded-2xl mb-5 text-sm font-black tracking-wider">
        <button
          onClick={() => handleDifficultyChange("normal")}
          className={`py-[14px] rounded-xl transition-all ${difficulty === "normal" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
        >
          📘 Normal
        </button>
        <button
          onClick={() => handleDifficultyChange("hard")}
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
            <div className="w-full max-w-[400px] flex flex-col gap-3 mb-6">

              <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                <div className="flex flex-col items-center w-1/3">
                  <span className="text-[10px] font-bold text-slate-500 tracking-widest">Target</span>
                  <div
                    className="w-12 h-12 rounded-xl mt-2 shadow-inner border border-slate-700 flex items-center justify-center text-xl"
                    style={{ backgroundColor: (isSeekerVictory && seekerTarget) ? seekerTarget.hex : "#1e293b" }}
                  >
                    {!isSeekerVictory && "❓"}
                  </div>
                  <span className="text-xs font-mono font-black mt-2 text-slate-300 text-center truncate w-full">
                    {isSeekerVictory && seekerTarget ? seekerTarget.hex.toUpperCase() : "Hidden"}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center w-1/3">
                  <div className={`w-10 h-10 rounded-full ${isSeekerVictory ? 'bg-emerald-500/20' : 'bg-slate-950'} flex items-center justify-center text-lg`}>
                    {isSeekerVictory ? "🏆" : "📡"}
                  </div>
                </div>

                <div className="flex flex-col items-center w-1/3">
                  <span className="text-[10px] font-bold text-slate-500 tracking-widest">Your Photo</span>
                  <div
                    className="w-12 h-12 rounded-xl mt-2 shadow-inner border border-slate-700"
                    style={{ backgroundColor: seekerPlayerHex || "#1e293b" }}
                  />
                  <span className="text-xs font-mono font-black mt-2 text-slate-300 text-center truncate w-full">
                    {seekerPlayerHex ? seekerPlayerHex.toUpperCase() : "#------"}
                  </span>
                </div>
              </div>

              <div className={`bg-slate-900 rounded-2xl p-3 flex flex-col items-center justify-center shadow-lg text-center ${isSeekerVictory ? 'border-emerald-500/50' : 'border-transparent'}`}>
                <span className="text-[14px] font-bold text-slate-500 tracking-widest mb-1">Hints</span>
                <span className={`text-xs md:text-sm font-bold leading-tight ${isSeekerVictory ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {seekerHint}
                </span>
              </div>
            </div>
          )}

          {((isLockedToday && gameMode === "daily") || (isSeekerVictory && gameMode === "seeker")) && (
            <div className="w-full max-w-[400px] mb-6 p-5 bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col items-center z-20">
              <h3 className="text-xs font-bold text-slate-400 tracking-widest mb-4 ">Share Your Results</h3>
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
                <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">{activePreviewText}</pre>
              </div>
            </div>
          )}

          <div className={`text-center text-lg mb-6 min-h-[28px] max-w-[340px] tracking-wide transition-all duration-300 ${messageColor}`}>
            {gameMessage}
          </div>

          <Viewfinder
            activeTarget={gameMode === "daily" ? activeTarget : seekerTarget}
            onPhotoCaptured={handlePhotoCaptured}
            isLockedToday={gameMode === "daily" ? isLockedToday : isSeekerVictory}
            savedPhoto={gameMode === "daily" ? currentDailySavedPhoto : seekerSavedPhoto}
            onReset={handleReset}
            difficulty={difficulty}
            gameMode={gameMode}
          />

          {gameMode === "daily" && currentAttempts > 0 && (
            <button
              onClick={handleRestartDayAction}
              className="mt-6 text-[11px] py-[14px] font-black tracking-widest text-rose-500/70 hover:text-rose-400 hover:underline transition-all cursor-pointer"
            >
              ⚠️ Restart Today ({difficulty.toUpperCase()})
            </button>
          )}

          {gameMode === "seeker" && isSeekerVictory && (
            <button
              onClick={pickNewSeekerTarget}
              className="mt-6 w-full max-w-[400px] py-[16px] bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl shadow-xl tracking-widest text-base transition-all"
            >
              🔎 Hunt a New Colour
            </button>
          )}
        </>
      )}

      <footer className="w-full max-w-[400px] mt-12 mb-4 pt-6 border-t border-slate-800/50 flex flex-col items-center justify-center text-center">
        <p className="text-[10px] text-slate-500 font-medium tracking-wide">
          &copy; {new Date().getFullYear()} Colour Hunter.
        </p>
        <p className="text-[10px] text-slate-500 font-medium tracking-wide mt-1.5 leading-relaxed max-w-[280px]">
          Idea inspired by <a href="https://www.youtube.com/watch?v=hwt6P425Fjc" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2">Atomic Shrimp</a>. Thank you for sharing your ideas!
        </p>
      </footer>
    </main>
  );
}