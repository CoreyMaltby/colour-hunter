// src/components/Scoreboard.tsx
"use client";

import { getContrastColour } from "../lib/colourMath";
import { DailyColour } from "../types";

interface ScoreboardProps {
  activeTarget: DailyColour | null;
  playerHex: string | null;
}

export default function Scoreboard({ activeTarget, playerHex }: ScoreboardProps) {
  // Determine text contrast configurations for the Target block
  const targetBg = activeTarget ? activeTarget.hex : "#BDC3C7";
  const targetText = activeTarget 
    ? getContrastColour(activeTarget.r, activeTarget.g, activeTarget.b) 
    : "#7F8C8D";

  // Determine text contrast configurations for the Player block
  let playerBg = "#BDC3C7";
  let playerText = "#7F8C8D";

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
    <div className="flex w-full max-w-[400px] gap-4 mb-5">
      {/* Target Color Block Panel */}
      <div 
        className="flex-1 flex flex-col items-center justify-center h-[90px] rounded-xl border-4 border-white shadow-sm text-sm font-bold text-center p-1.5 transition-colors duration-300"
        style={{ backgroundColor: targetBg, color: targetText }}
      >
        <span className="text-[11px] uppercase tracking-wider mb-1 opacity-70">Target Colour</span>
        <span className="text-base font-extrabold">{activeTarget ? activeTarget.name : "Loading..."}</span>
        <span className="text-xs font-normal mt-0.5">{activeTarget ? activeTarget.hex.toUpperCase() : "#------"}</span>
      </div>

      {/* Captured Player Color Block Panel */}
      <div 
        className="flex-1 flex flex-col items-center justify-center h-[90px] rounded-xl border-4 border-white shadow-sm text-sm font-bold text-center p-1.5 transition-colors duration-300"
        style={{ backgroundColor: playerBg, color: playerText }}
      >
        <span className="text-[11px] uppercase tracking-wider mb-1 opacity-70">Your Colour</span>
        <span className="text-base font-extrabold tracking-wide">{playerHex ? playerHex.toUpperCase() : "? ? ?"}</span>
      </div>
    </div>
  );
}