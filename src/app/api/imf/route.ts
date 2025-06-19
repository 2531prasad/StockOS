
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  console.log("[IMF FETCH]", `→ /api/imf?code=${code}`);
  console.log("📦 Received IMF fetch request for:", code);
  

  if (!code) {
    return NextResponse.json({ error: "Indicator code is required" }, { status: 400 });
  }

  const imfApiUrl = `https://www.imf.org/external/datamapper/api/v1/${code}/IND`;
  console.log("🌐 Full URL to fetch:", imfApiUrl);
  console.log("→ Fetching IMF URL via proxy:", imfApiUrl);

  try {
    const response = await fetch(imfApiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FloatCalc-IMF-Proxy/1.0', 
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Use the user's preferred logging style
      console.error("↯ IMF Response Error:", response.status, errorText);
      // Forward the status from IMF and provide more details
      return NextResponse.json({ 
        error: "IMF API returned an error", 
        details: errorText, 
        upstreamStatus: response.status 
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });

  } catch (e: any) {
    // Use the user's preferred logging style for proxy errors
    console.error("↯ Proxy Fetch Error:", e.message, e);
    // Use 504 for gateway timeout or general proxy failure
    return NextResponse.json({ 
      error: "Proxy request to IMF API failed", 
      details: e.message || String(e) 
    }, { status: 504 });
  }
}

