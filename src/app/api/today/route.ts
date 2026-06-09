import { NextResponse } from "next/server";
import dailyColours from "../../../data/daily_colours.json";
import { DailyColour } from "../../../types";

export async function GET() {
    try {
        const epoch = new Date("2026-01-01T00:00:00Z");
        const today = new Date();

        const diffInTime = today.getTime() - epoch.getTime();
        const currentDay = Math.floor(diffInTime / (1000 * 3600 * 24));

        const colourIndex = Math.abs(currentDay) % dailyColours.length;
        const targetChallange: DailyColour = dailyColours[colourIndex];

        return NextResponse.json(targetChallange, {
            status: 200,
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            }
        });
    } catch (error) {
        console.error("Data api router encountered an error:", error)
        return NextResponse.json(
            { error: "Internal Server Processing Exception" },
            { status: 500 }
        );
    }
}