import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
    }

    const credentials = JSON.parse(serviceAccountKey);
    const spreadsheetId = '1io6QA_SGAyLa38713OJ39WYMEalaR3DECP1UbCHOzHg';
    
    console.log('Creating JWT for service account:', credentials.client_email);
    
    // Create JWT
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: getNumericDate(3600),
      iat: getNumericDate(0),
    };

    // Import private key - properly handle PEM format
    const privateKeyPem = credentials.private_key;
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    
    // Extract base64 content between headers
    const base64Content = privateKeyPem
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s+/g, '');
    
    const binaryDer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
    
    const key = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

    const jwt = await create({ alg: "RS256", typ: "JWT" }, payload, key);
    
    console.log('JWT created, requesting access token');

    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token response error:', errorText);
      throw new Error(`Failed to get access token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    console.log('Access token obtained, fetching spreadsheet data');

    // Fetch spreadsheet data
    const sheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Лист1!A:C`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!sheetsResponse.ok) {
      const errorText = await sheetsResponse.text();
      console.error('Sheets response error:', errorText);
      throw new Error(`Failed to fetch spreadsheet: ${errorText}`);
    }

    const data = await sheetsResponse.json();
    
    console.log('Spreadsheet data fetched successfully');

    // Parse prices from Google Sheet
    const prices: Record<string, Record<string, number>> = {};
    
    console.log('Raw data from sheet:', JSON.stringify(data.values?.slice(0, 5)));
    
    if (data.values && data.values.length > 1) {
      // Skip header row
      for (let i = 1; i < data.values.length; i++) {
        const row = data.values[i];
        if (row.length >= 3) {
          let model = row[0]?.toString().trim();
          let storage = row[1]?.toString().trim();
          const priceStr = row[2]?.toString().replace(/\D/g, '');
          const price = parseInt(priceStr || '0');
          
          // Normalize model name (remove extra spaces, make consistent)
          model = model
            .replace(/iphone/i, 'iPhone')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Normalize storage format to match frontend (128GB, 256GB, etc.)
          storage = storage
            .replace(/гб|gb/gi, 'GB')
            .replace(/\s+/g, '')
            .trim();
          
          if (model && storage && price > 0) {
            if (!prices[model]) {
              prices[model] = {};
            }
            prices[model][storage] = price;
            console.log(`Parsed: ${model} | ${storage} | ${price} ₽`);
          }
        }
      }
    }

    console.log(`Total prices loaded: ${Object.keys(prices).length} models`);

    return new Response(
      JSON.stringify({ prices }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-prices function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});