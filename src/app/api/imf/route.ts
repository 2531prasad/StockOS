
import { fetchIMFData } from "@/lib/fetchIMFData";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  console.log("[IMF FETCH]", `→ /api/imf?code=${code}`);
  console.log("📦 Received IMF fetch request via proxy for:", code);
  

  if (!code) {
    return NextResponse.json({ error: "Indicator code (param: 'code') is required" }, { status: 400 });
  }

  const fullIMFUrl = `https://www.imf.org/external/datamapper/api/v1/${code}/IND`;
  console.log("🌐 Proxying request to full IMF URL:", fullIMFUrl);

  try {
    // Use the dedicated fetchIMFData utility from lib
    const data = await fetchIMFData(code, "IND"); 
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    // The error from fetchIMFData will include status and body if available
    // Or it might be a network error from the fetch call itself within fetchIMFData
    console.error("↯ Proxy Error during IMF fetch:", e.message, e);
    
    // Try to determine a reasonable status code.
    // If the error message contains a status code (e.g., "Failed to fetch IMF data: 404 ..."), use it.
    const statusMatch = e.message?.match(/Failed to fetch IMF data.*? (\d{3})/);
    const upstreamStatus = statusMatch ? parseInt(statusMatch[1], 10) : 502; // Default to 502 Bad Gateway if no specific status found

    return NextResponse.json({ 
      error: "Proxy request to IMF API failed", 
      details: e.message || String(e) 
    }, { status: upstreamStatus });
  }
}
