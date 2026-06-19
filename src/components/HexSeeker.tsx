"use client";

import { useEffect, useState } from "react";
import Viewfinder from "./Viewfinder";
import { DailyColour } from "../types";
import { generateSeekerHint } from "../lib/colourMath";

export default function HexSeekerMode() {
    const [activeTarget, setActiveTarget] = useState<DailyColour | null>(null);
    const [playerHex, setPlayerHex] = useState<string | null>(null);
    const [difficulty, setDifficulty] = useState<"normal" | "hard">("normal");

    // CSV State
    const [colourDatabase, setColourDatabase] = useState<DailyColour[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Seeker State
    const [attempts, setAttempts] = useState<number>(0);
    const [isVictory, setIsVictory] = useState<boolean>(false);
    const [gameMessage, setGameMessage] = useState<string>("Loading colour database...");
    const [hintColor, setHintColor] = useState<string>("text-slate-400");
    const [savedPhoto, setSavedPhoto] = useState<string>("");

    // Parse CSV
    const parseCSVLine = (line: string) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') {
                inQuotes = !inQuotes;
            } else if (line[i] === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += line[i];
            }
        }
        result.push(current);
        return result;
    };

    // Fetch CSV and parse
    useEffect(() => {
        const loadCSV = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('../data/color_names.csv');
                if (!response.ok) throw new Error("Failed to fetch CSV");

                const csvText = await response.text();
                const lines = csvText.split('\n').filter(line => line.trim() !== '');

                const parsedColours: DailyColour[] = lines.slice(1).map(line => {
                    const parts = parseCSVLine(line);
                    return {
                        name: parts[0].trim(),
                        hex: parts[1].trim(),
                        r: parseInt(parts[2], 10),
                        g: parseInt(parts[3], 10),
                        b: parseInt(parts[4], 10)
                    };
                }).filter(c => !isNaN(c.r) && c.name); // Remove broken rows

                setColourDatabase(parsedColours);
                pickNewTarget(parsedColours);
                setIsLoading(false);
            } catch (error) {
                console.error("Error parsing CSV:", error);
                setGameMessage("Error loading database. Please check your network.");
                setHintColor("text-rose-500");
            }
        };

        loadCSV();
    }, []);

    // Get random colour
    const pickNewTarget = (db: DailyColour[] = colourDatabase) => {
        if (db.length === 0) return;

        const randomColor = db[Math.floor(Math.random() * db.length)];
        setActiveTarget(randomColor);
        setAttempts(0);
        setIsVictory(false);
        setPlayerHex(null);
        setSavedPhoto("");
        setGameMessage("Take your first photo to get a hint!");
        setHintColor("text-slate-400");
    };

    const handleDifficultyToggle = (mode: "normal" | "hard") => {
        if (attempts > 0 && !isVictory) {
            const confirm = window.confirm(`Switch to ${mode} mode? This will reset your current hunt.`);
            if (!confirm) return;
        }
        setDifficulty(mode);
        pickNewTarget();
    };

    const handlePhotoCaptured = (score: number, detectedColourHex: string, photoDataUrl: string, rawR: number, rawG: number, rawB: number) => {
        if (isVictory || !activeTarget) return;

        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPlayerHex(detectedColourHex);
        setSavedPhoto(photoDataUrl);

        if (score >= 80) {
            setIsVictory(true);
            setGameMessage(`🎯 Target Found: ${activeTarget.name}! You did it in ${newAttempts} shots!`);
            setHintColor("text-emerald-400 font-extrabold");
        } else {
            // Generate hint
            const hint = generateSeekerHint(
                rawR, rawG, rawB,
                activeTarget.r, activeTarget.g, activeTarget.b
            );
            setGameMessage(`${score}% Match. ${hint}`);
            setHintColor("text-amber-400 font-medium");
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-50 p-4 antialiased">
            <div className="flex items-center justify-between w-full max-w-[400px] mb-5 px-1">
                <div className="flex flex-col text-left">
                    <h1 className="text-3xl font-black text-white tracking-wider leading-none">
                        Colour Hunter
                    </h1>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest mt-1">
                        Hex Seeker Mode 🔎
                    </p>
                </div>
            </div>

            <div className="w-full max-w-[400px] grid grid-cols-2 p-1 bg-slate-900 rounded-xl mb-5 text-xs font-bold tracking-wider">
                <button
                    onClick={() => handleDifficultyToggle("normal")}
                    className={`py-2 rounded-lg transition-all ${difficulty === "normal" ? "bg-blue-600 text-white shadow-md" : "text-slate-400"}`}
                >
                    📘 Normal
                </button>
                <button
                    onClick={() => handleDifficultyToggle("hard")}
                    className={`py-2 rounded-lg transition-all ${difficulty === "hard" ? "bg-purple-600 text-white shadow-md" : "text-slate-400"}`}
                >
                    🧠  Hard
                </button>
            </div>

            {isLoading ? (
                <div className="h-[200px] flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    <div className="w-full max-w-[400px] bg-slate-900 rounded-2xl p-4 shadow-xl mb-6 flex items-center justify-between">
                        <div className="flex flex-col items-center">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Target</p>
                            <div className="w-16 h-16 rounded-xl shadow-inner border border-slate-700/50 flex items-center justify-center text-2xl"
                                style={{ backgroundColor: isVictory ? activeTarget?.hex : "#1e293b" }}>
                                {!isVictory && "❓"}
                            </div>
                            <p className="text-xs font-bold text-slate-300 mt-2 text-center w-full max-w-[100px] truncate">
                                {isVictory ? activeTarget?.name : "Hidden"}
                            </p>
                        </div>

                        <div className="flex flex-col items-center justify-center h-full px-2">
                            <span className="text-3xl animate-pulse">📡</span>
                        </div>

                        <div className="flex flex-col items-center">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Your Photo</p>
                            <div className="w-16 h-16 rounded-xl shadow-inner border border-slate-700/50"
                                style={{ backgroundColor: playerHex || "#1e293b" }} />
                            <p className="text-xs font-bold text-slate-300 mt-2 text-center w-full">
                                {playerHex ? playerHex.toUpperCase() : "------"}
                            </p>
                        </div>
                    </div>

                    <div className="mb-4 px-4 py-1.5 bg-slate-900 text-slate-400 text-xs font-black shadow-inner tracking-widest flex items-center gap-2 rounded-lg">
                        Shots Fired: <span className="text-blue-400 text-sm">{attempts}</span>
                    </div>

                    <div className={`text-center text-sm md:text-base mb-6 min-h-[48px] max-w-[340px] tracking-wide ${hintColor}`}>
                        {gameMessage}
                    </div>

                    <Viewfinder
                        activeTarget={activeTarget}
                        onPhotoCaptured={handlePhotoCaptured}
                        isLockedToday={isVictory}
                        savedPhoto={savedPhoto}
                        difficulty={difficulty}
                        onReset={() => { }}
                    />

                    {isVictory && (
                        <button
                            onClick={() => pickNewTarget()}
                            className="mt-8 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all"
                        >
                            Hunt a New Colour
                        </button>
                    )}
                </>
            )}
        </main>
    );
}