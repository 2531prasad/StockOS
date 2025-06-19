
import { fetchIMFData } from "@/lib/fetchIMFData";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  console.log("[IMF FETCH]", `→ /api/imf?code=${code}`);
  console.log("📦 Received IMF fetch request via proxy for:", code);
  

  if (!code) {
    return NextResponse.json({ error: "Indicator code is required" }, { status: 400 });
  }

  // The country code is now defaulted in fetchIMFData utility, but can be overridden if needed.
  // For this proxy, we'll stick to "IND" or let the utility handle its default.
  console.log("🌐 Proxying request for indicator code:", code, "for country: IND");

  try {
    // Use the new utility function
    const data = await fetchIMFData(code, "IND"); 
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    // The error from fetchIMFData will include status and body if available
    console.error("↯ Proxy Error during IMF fetch:", e.message, e);
    // Attempt to parse status from error message if it's from our utility
    const statusMatch = e.message?.match(/Failed to fetch IMF data.*? (\d{3})/);
    const upstreamStatus = statusMatch ? parseInt(statusMatch[1], 10) : 502; // Default to 502 Bad Gateway

    return NextResponse.json({ 
      error: "Proxy request to IMF API failed", 
      details: e.message || String(e) 
    }, { status: upstreamStatus });
  }
}
