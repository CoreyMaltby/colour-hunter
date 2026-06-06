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

  useEffect(() => {
    async function loadDailyChallenge() {
      try {
        const response = await fetch("/api/today");
        if (!response.ok) throw new Error("Network transaction failed.");

        const data: DailyColour = await response.json();
        setActiveTarget(data);
      } catch (err) {
        console.error("Failed to query target matrix parameters:", err);
        setGameMessage("Could not load today's challenge color. Check local server connection.");
        setMessageColor("text-red-600");
      } finally {
        setIsLoading(false);
      }
    }

    loadDailyChallenge();
  }, []);

  const handlePhotoCaptured = (score: number, detectedColor: string) => {
    // Save the hex code to state to render the color on the scoreboard
    setPlayerHex(detectedColor);

    if (score >= 90) {
      setGameMessage(`Match! ${score}% Similarity!`);
      setMessageColor("text-green-600 font-extrabold animate-bounce");
    } else {
      setGameMessage(`Try Again! ${score}% Similarity`);
      setMessageColor("text-red-600 font-semibold");
    }
  };

  const handleReset = () => {
    setPlayerHex(null);
    setGameMessage("Aim and take your shot!");
    setMessageColor("text-slate-700 font-normal");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading Colour Input Logic...</p>
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

      <div className={`text-center text-lg mb-4 min-h-[28px] transition-all duration-300 ${messageColor}`}>
        {gameMessage}
      </div>

      <Viewfinder 
        activeTarget={activeTarget}
        onPhotoCaptured={handlePhotoCaptured}
        onReset={handleReset}
      />
    </main>
  );
}