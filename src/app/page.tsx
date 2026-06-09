"use client";

import { useEffect, useState } from "react";
import Viewfinder from "../components/Viewfinder";
import Scoreboard from "../components/Scoreboard";
import { DailyColour } from "../types";

export default function Home() {
  const [activeTarget, setActiveTarget] = useState<DailyColour | null>(null);
  const [playerHex, setPlayerHex] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [gameMessage, setGameMessage] = useState<string>("Aim and take your shot!");
  const [messageColor, setMessageColor] = useState<string>("text-slate-700");


  // Game tracking metrics
  const [isLockedToday, setIsLockedToday] = useState<boolean>(false);
  const [savedPhoto, setSavedPhoto] = useState<string>("");
  const [attempts, setAttempts] = useState<number>(0);

  const getDailyStorageKey = () => {
    const d = new Date();
    return `colour-hunter-game-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

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

          // If they previously unlocked a win code for today, trigger a strict lock
          if (parsedSession.isVictory) {
            setPlayerHex(parsedSession.playerHex);
            setSavedPhoto(parsedSession.photoDataUrl);
            setIsLockedToday(true);
            setGameMessage(`Complete! Match found in ${parsedSession.attempts} photos!`);
            setMessageColor("text-green-600 font-extrabold");
          } else {
            // Otherwise, let them continue from where they left off with their shot count intact
            setGameMessage(`Keep hunting! Current attempts: ${parsedSession.attempts}`);
            setMessageColor("text-slate-600 font-medium");
          }
        }
      } catch (err) {
        console.error("Initialization pipeline crash:", err);
        setGameMessage("Could not synchronise game state parameters.");
        setMessageColor("text-red-600");
      } finally {
        setIsLoading(false);
      }
    }

    loadDailyChallenge();
  }, []);

  const handlePhotoCaptured = (score: number, detectedColour: string, photoDataUrl: string) => {
    // Increment photo submission counter
    const newAttemptCount = attempts + 1;
    setAttempts(newAttemptCount);
    setPlayerHex(detectedColour);

    const isVictoryMatch = score >= 90;
    const storageKey = getDailyStorageKey();

    const sessionPayload = {
      score,
      playerHex: detectedColour,
      photoDataUrl: isVictoryMatch ? photoDataUrl : "",
      attempts: newAttemptCount,
      isVictory: isVictoryMatch,
      completedAt: new Date().toISOString()
    }
    localStorage.setItem(storageKey, JSON.stringify(sessionPayload));

    if (isVictoryMatch) {
      // Lock the game only if target threshold met
      setSavedPhoto(photoDataUrl);
      setIsLockedToday(true);
      setGameMessage(`🎯 Match! ${score}% Similarity! Cleared in ${newAttemptCount} photos!`);
      setMessageColor("text-green-600 font-extrabold animate-bounce");
    } else {
      // Keep viewfinder loop unlocked but display contextual feedback tracking failure metrics
      setGameMessage(`❌ ${score}% Match - Try Again! Total Photos: ${newAttemptCount}`);
      setMessageColor("text-red-600 font-semibold");
    }
  };

  const handleReset = () => {
    setPlayerHex(null);
    setGameMessage(`Aim and take your Photo! (Photos taken: ${attempts})`);
    setMessageColor("text-slate-700 font-normal");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading Game States...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-4">
        Colour Hunter Prototype
      </h1>

      <Scoreboard activeTarget={activeTarget} playerHex={playerHex} />

      <div className="mb-2 px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-full uppercase tracking-wider">
        Photos Taken: {attempts}
      </div>

      <div className={`text-center text-lg mb-4 min-h-[28px] transition-all duration-300 ${messageColor}`}>
        {gameMessage}
      </div>

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