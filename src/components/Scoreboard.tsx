"use client";

import { getContrastColour } from "../lib/colourMath";
import { DailyColour } from "../types";

interface ScoreboardProps {
  activeTarget: DailyColour | null;
  playerHex: string | null;
}

export default function Scoreboard({ activeTarget, playerHex }: ScoreboardProps) {
  // Determine text contrast configurations for the Target block
  const targetBg = activeTarget ? activeTarget.hex : "#1E293B";
  const targetText = activeTarget
    ? getContrastColour(activeTarget.r, activeTarget.g, activeTarget.b)
    : "#94A3B8";

  // Determine text contrast configurations for the Player block
  let playerBg = "#1E293B";
  let playerText = "#94A3B8";

  if (playerHex) {
    playerBg = playerHex;
    // Extract hex components back to decimal integers to feed our contrast validator
    const hex = playerHex.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    playerText = getContrastColour(r, g, b);
  }

  return (
    <div className="flex w-full max-w-[400px] gap-4 mb-6">
      {/* Target Color Block Panel */}
      <div
        className="flex-1 flex flex-col items-center justify-center h-[100px] rounded-2xl border-2 border-slate-700/50 shadow-xl text-center p-2 transition-all duration-500 ease-in-out transform hover:scale-[1.02]"
        style={{ backgroundColor: targetBg, color: targetText }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-widest mb-1"
          style={{ color: targetText, opacity: targetText === "#000000" ? 0.65 : 0.75 }}
        >
          Target Colour
        </span>
        <span className="text-base font-black leading-tight drop-shadow-sm px-1 truncate max-w-full">
          {activeTarget ? activeTarget.name : "Loading..."}
        </span>
        <span className="text-xs font-mono font-medium mt-1" style={{ opacity: targetText === "#000000" ? 0.7 : 0.85 }}>
          {activeTarget ? activeTarget.hex.toUpperCase() : "#------"}
        </span>
      </div>

      {/* Captured Player Color Block Panel */}
      <div
        className="flex-1 flex flex-col items-center justify-center h-[100px] rounded-2xl border-2 border-slate-700/50 shadow-xl text-center p-2 transition-all duration-500 ease-in-out transform hover:scale-[1.02]"
        style={{ backgroundColor: playerBg, color: playerText }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-widest mb-1"
          style={{ color: playerText, opacity: playerText === "#000000" ? 0.65 : 0.75 }}
        >
          Your Colour
        </span>
        <span className="text-base font-black tracking-wide drop-shadow-sm">
          {playerHex ? playerHex.toUpperCase() : "— — —"}
        </span>
        <span className="text-xs font-mono font-medium mt-1" style={{ opacity: playerText === "#000000" ? 0.4 : 0.5 }}>
          {!playerHex && "Waiting..."}
        </span>
      </div>
    </div>
  );
}