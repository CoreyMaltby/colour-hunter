"use client";

import { useEffect, useState } from "react";

interface ArchiveItem {
    dateLabel: string;
    targetName: string;
    targetHex: string;
    playerHex: string;
    photoDataUrl: string;
    attempts: number;
    score: number;
    difficulty: "normal" | "hard";
}

export default function ArchiveGallery({ activeResetTrigger }: { activeResetTrigger: boolean }) {
    const [historyItems, setHistoryItems] = useState<ArchiveItem[]>([]);

    useEffect(() => {
        const archiveList: ArchiveItem[] = [];
        const now = new Date();

        // Look backward through the last 7 days
        for (let i = 1; i <= 7; i++) {
            const targetDate = new Date(now);
            targetDate.setDate(now.getDate() - i);

            const year = targetDate.getFullYear();
            const month = targetDate.getMonth() + 1;
            const day = targetDate.getDate();

            const formattedDateLabel = targetDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            });

            // Check both difficulty keys for this calendar day
            const modes: ("normal" | "hard")[] = ["normal", "hard"];

            modes.forEach((mode) => {
                const storageKey = `colour-hunter-game-${mode}-${year}-${month}-${day}`;
                const savedRaw = localStorage.getItem(storageKey);

                if (savedRaw) {
                    try {
                        const parsed = JSON.parse(savedRaw);
                        // Show it if it was a victory
                        if (parsed.attempts > 0 || parsed.isVictory) {
                            archiveList.push({
                                dateLabel: formattedDateLabel,
                                targetName: parsed.targetName || (parsed.playerHex ? `Colour Hunt [${parsed.playerHex.toUpperCase()}]` : `${mode.toUpperCase()} Mode`),
                                targetHex: parsed.targetHex || parsed.playerHex || "#------",
                                playerHex: parsed.playerHex || "#------",
                                photoDataUrl: parsed.photoDataUrl || "",
                                attempts: parsed.attempts || 1,
                                score: parsed.score || 0,
                                difficulty: mode,
                            });
                        }
                    } catch (e) {
                        console.error("Failed to parse historical data matrix node:", e);
                    }
                }
            });
        }

        setHistoryItems(archiveList);
    }, [activeResetTrigger]);

    if (historyItems.length === 0) {
        return (
            <div className="w-full max-w-[400px] mt-10 border-t border-slate-900/60 pt-6 text-center">
                <h2 className="text-xs font-black text-slate-600 tracking-widest mb-2">Past Matches Gallery</h2>
                <p className="text-xs text-slate-500 italic">No past matches found on this browser context yet. Complete multiple days to unlock history logs!</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[400px] mt-10 border-t border-slate-900 pt-6 animate-fade-in pb-12">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 pl-1">
                Past Matches Gallery
            </h2>
            <div className="flex flex-col gap-3">
                {historyItems.map((item, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between bg-slate-900/40 border border-slate-900/60 p-3 rounded-xl gap-4 hover:border-slate-800 transition-all duration-200"
                    >
                        <div className="flex flex-col text-left min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-200">{item.dateLabel}</span>
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${item.difficulty === "hard"
                                        ? "bg-purple-950/60 text-purple-400 border border-purple-900/40"
                                        : "bg-blue-950/60 text-blue-400 border border-blue-900/40"
                                    }`}>
                                    {item.difficulty}
                                </span>
                            </div>
                            <span className="text-xs font-bold text-slate-400 mt-1 truncate max-w-full">
                                {item.targetName}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 tracking-wide mt-0.5">
                                {item.attempts} {item.attempts === 1 ? "shot" : "shots"} taken
                            </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <div className="flex flex-col text-right">
                                <span className="text-xs font-mono font-black text-emerald-400">
                                    {item.score}%
                                </span>
                                <span className="text-[9px] font-mono text-slate-500 uppercase mt-0.5">
                                    {item.playerHex}
                                </span>
                            </div>

                            {item.photoDataUrl ? (
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-800/80 bg-slate-950 shrink-0 relative">
                                    <img
                                        src={item.photoDataUrl}
                                        alt="Capture snapshot"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div
                                    className="w-10 h-10 rounded-lg border border-slate-800/80 shrink-0 shadow-inner"
                                    style={{ backgroundColor: item.playerHex }}
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}