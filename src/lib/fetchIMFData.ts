// src/lib/fetchIMFData.ts

/**
 * Fetches data directly from the IMF DataMapper API for a given indicator code and country.
 * @param code The IMF indicator code (e.g., "NGDPD").
 * @param country The country code (e.g., "IND").
 * @returns A Promise that resolves to the JSON response from the IMF API.
 * @throws An error if the fetch fails or the API returns a non-OK status.
 */
export async function fetchIMFData(code: string, country = "IND") {
  const url = `https://www.imf.org/external/datamapper/api/v1/${code}/${country}`;
  // console.log("Attempting direct IMF fetch to:", url); // Optional: for server-side logging if needed

  const res = await fetch(url, {
    headers: {
      // It's good practice to identify your client, though IMF API might not require it.
      "User-Agent": "FloatCalc-IMF-Fetcher/1.0 (Direct)",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    // console.error(`Direct IMF Fetch Error for ${code}/${country}: ${res.status}`, body); // Optional
    throw new Error(
      `Failed to fetch IMF data for ${code}/${country}: ${res.status} ${body || "No error body from IMF"}`
    );
  }

  return res.json();
}
