
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: "Indicator code is required" }, { status: 400 });
  }

  const imfApiUrl = `https://www.imf.org/external/datamapper/api/v1/${code}/IND`;

  try {
    // It's good practice to include an Accept header
    const response = await fetch(imfApiUrl, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Route Error] IMF API request failed for code ${code}: ${response.status} ${response.statusText}. Response body: ${errorText}`);
      return NextResponse.json({ error: "Upstream IMF API error", details: `Status: ${response.status}, Body: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });

  } catch (e: any) {
    console.error(`[API Route Error] Fetch failed for IMF API proxy (code ${code}):`, e);
    return NextResponse.json({ error: "Fetch failed via proxy", details: e.message || String(e) }, { status: 500 });
  }
}
