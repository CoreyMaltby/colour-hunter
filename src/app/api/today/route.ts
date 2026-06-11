import { NextResponse } from "next/server";
import dailyColoursData from "../../../data/daily_colours.json";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const requestedMode = searchParams.get("mode") === "hard" ? "hard" : "normal";

        // Get correct array of colours
        const colourPool = dailyColoursData[requestedMode] || dailyColoursData.normal;

        const now = new Date();
        const dayOfYear = Math.floor(
            (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
        );

        const selectedIndex = dayOfYear % colourPool.length;
        const todaysColour = colourPool[selectedIndex];

        return NextResponse.json(todaysColour);
    } catch (error) {
        console.error("API Retrieval error:", error);
        return NextResponse.json({ error: "Failed to load daily spectrum color metrics." }, { status: 500 });
    }
}