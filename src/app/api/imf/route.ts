
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: "Indicator code is required" }, { status: 400 });
  }

  const imfApiUrl = `https://www.imf.org/external/datamapper/api/v1/${code}/IND`;
  console.log("→ Fetching IMF URL via proxy:", imfApiUrl);

  try {
    const response = await fetch(imfApiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FloatCalc-IMF-Proxy/1.0', // Added User-Agent
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Route Error] IMF API request failed for code ${code}: ${response.status} ${response.statusText}. Response body: ${errorText}`);
      // Forward the status from IMF if available, otherwise use a generic 502
      const upstreamStatus = response.status || 502; 
      return NextResponse.json({ error: "Upstream IMF API error", details: `Status: ${response.status}, Body: ${errorText}` }, { status: upstreamStatus });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });

  } catch (e: any) {
    console.error(`[API Route Error] Proxy fetch failed for IMF API (code ${code}):`, e.message, e);
    // Use 504 for gateway timeout or general proxy failure
    return NextResponse.json({ error: "Proxy request to IMF API failed", details: e.message || String(e) }, { status: 504 });
  }
}
