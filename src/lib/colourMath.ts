import chroma from "chroma-js";

export function calculateMatchScore(
    r1: number, g1: number, b1: number,
    r2: number, g2: number, b2: number,
    difficulty: "normal" | "hard" = "normal",
    gameMode: "daily" | "seeker" = "daily"
): number {
    const colour1 = chroma(r1, g1, b1);
    const colour2 = chroma(r2, g2, b2);

    const deltaE = chroma.deltaE(colour1, colour2)

    // Daily Mode
    let maxAllowableDistance = difficulty === "hard" ? 20 : 30;

    // Hex Seeker
    if (gameMode === "seeker") {
        maxAllowableDistance = difficulty === "hard" ? 35 : 50; 
    }

    if (deltaE >= maxAllowableDistance) {
        return 0;
    }

    const scorePercentage = (1 - deltaE / maxAllowableDistance) * 100;

    return Math.max(0, Math.round(scorePercentage))
}

export function rgbToHex(r: number, g: number, b: number): string {
    return chroma(r, g, b).hex().toUpperCase();
}

// Determine contrasting text color (black or white) based on background brightness
export function getContrastColour(r: number, g: number, b: number): string {
    const red = Number(r);
    const green = Number(g);
    const blue = Number(b);
    const brightness = red * 0.299 + green * 0.587 + blue * 0.114;
    return brightness > 186 ? "#000000" : "#ffffff";
}

// Hex Seeker
export function generateSeekerHint(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): string {
    const chroma = require("chroma-js");

    const pLab = chroma(r1, g1, b1).lab(); // Player
    const tLab = chroma(r2, g2, b2).lab(); // Target

    const deltaL = tLab[0] - pLab[0]; // Lightness
    const deltaA = tLab[1] - pLab[1]; // Red/Green axis
    const deltaB = tLab[2] - pLab[2]; // Yellow/Blue axis

    const totalDist = chroma.distance(chroma(r1, g1, b1), chroma(r2, g2, b2));

    const maxDiff = Math.max(Math.abs(deltaL), Math.abs(deltaA), Math.abs(deltaB));

    if (totalDist < 5) return "🔥 You are practically touching it! Tiny adjustments now.";

    let temperature = "";
    if (totalDist > 50) temperature = "🧊 Way off! ";
    else if (totalDist < 15) temperature = "🔥 Getting hot! ";

    let direction = "";

    if (maxDiff === Math.abs(deltaL)) {
        direction = deltaL > 0
            ? "Your photo is too dark. Point at something brighter! ☀️"
            : "Your photo is too bright. Find something darker! 🌑";

    } else if (maxDiff === Math.abs(deltaA)) {
        direction = deltaA > 0
            ? "Your photo is too green. Look for something more red/pink! 🍎"
            : "Your photo is too red. Look for something more green! 🌿";

    } else {
        direction = deltaB > 0
            ? "Your photo is too blue. Look for something more yellow/orange! 🌻"
            : "Your photo is too yellow. Look for something more blue! 💧";
    }

    return temperature + direction;
}