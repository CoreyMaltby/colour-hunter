import chroma from "chroma-js";

/**
 * Calculates the match score between two RGB colors using the CIE2000 standard.
 * Delta E 2000 values typically range from 0 (identical) to 100 (complete opposites).
 * A Delta E distance of <= 1.0 is considered an imperceptible difference to the human eye.
 */
export function calculateMatchScore(
    r1: number, g1: number, b1: number,
    r2: number, g2: number, b2: number
): number {
    const colour1 = chroma(r1, g1, b1);
    const colour2 = chroma(r2, g2, b2);

    const deltaE = chroma.deltaE(colour1, colour2)

    const maxAllowableDistance = 30;

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