import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function parseCSVRows(csvText: string) {
  const lines = csvText.split(/\r?\n/);
  const results: any[] = [];
  
  if (lines.length <= 1) return results;

  // Clean double quotes from the header row line
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const nameIdx = headers.indexOf("Name");
  const hexIdx = headers.indexOf("Hex (24 bit)");
  const redIdx = headers.indexOf("Red (8 bit)");
  const greenIdx = headers.indexOf("Green (8 bit)");
  const blueIdx = headers.indexOf("Blue (8 bit)");

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Splits columns by comma while respecting quoted values containing strings
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
    const columns = matches.map(c => c.replace(/^"|"$/g, '').trim());

    if (columns.length < 5) continue;

    results.push({
      name: columns[nameIdx] || "Unknown Color",
      hex: columns[hexIdx] || "#000000",
      r: parseInt(columns[redIdx]) || 0,
      g: parseInt(columns[greenIdx]) || 0,
      b: parseInt(columns[blueIdx]) || 0,
    });
  }

  return results;
}

export async function GET() {
  try {
    // Array of paths to try finding your CSV dataset file
    const possiblePaths = [
      path.join(process.cwd(), "color_names.csv"),
      path.join(process.cwd(), "public", "color_names.csv"),
      path.join(process.cwd(), "src", "data", "color_names.csv")
    ];

    let csvFilePath = "";
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        csvFilePath = testPath;
        break;
      }
    }
    
    if (!csvFilePath) {
      console.error("Missing file: color_names.csv could not be found anywhere in project folders.");
      return NextResponse.json(
        { error: "color_names.csv not found. Place it in the root or public/ folder." }, 
        { status: 404 }
      );
    }

    const csvContent = fs.readFileSync(csvFilePath, "utf-8");
    const parsedColorsArray = parseCSVRows(csvContent);

    return NextResponse.json(parsedColorsArray);
  } catch (error: any) {
    console.error("API CSV processing pipeline faulted:", error);
    return NextResponse.json(
      { error: "Internal Server Error parsing color dataset.", details: error.message }, 
      { status: 500 }
    );
  }
}