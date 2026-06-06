// src/lib/colorMath.ts

export function calculateMatchScore(
    r1: number,
    g1: number,
    b1: number,
    r2: number,
    g2: number,
    b2: number
): number {
    const rDiff = r1 - r2;
    const gDiff = g1 - g2;
    const bDiff = b1 - b2;

    const meanR = (r1 + r2) / 2;

    // Weighted Euclidean formula components
    const weightR = 2 + (meanR / 256);
    const weightG = 4;
    const weightB = 2 + ((255 - meanR) / 256);

    const distance = Math.sqrt(
        (weightR * Math.pow(rDiff, 2)) +
        (weightG * Math.pow(gDiff, 2)) +
        (weightB * Math.pow(bDiff, 2))
    );

    const maxPerceptualDistance = 764.833; // Maximum distance in the weighted RGB space

    const scorePercentage = (1 - (distance / maxPerceptualDistance)) * 100;
    return Math.max(0, Math.round(scorePercentage));
}

export function rgbToHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("").toUpperCase();
}

// Determine contrasting text color (black or white) based on background brightness
export function getContrastColour(r: number, g: number, b: number): string {
    const red = Number(r);
    const green = Number(g);
    const blue = Number(b);
    const brightness = (red * 0.299 + green * 0.587 + blue * 0.114);
    return brightness > 186 ? '#000000' : '#ffffff';
}