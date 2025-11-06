import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'exchange') {
      const { code, redirectUri } = await req.json();
      const clientId = Deno.env.get('INSTAGRAM_CLIENT_ID');
      const clientSecret = Deno.env.get('INSTAGRAM_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        throw new Error('Instagram OAuth credentials not configured');
      }

      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
      });

      const response = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Token exchange failed', details: data }),
          {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (action === 'refresh') {
      const { refreshToken } = await req.json();
      const clientSecret = Deno.env.get('INSTAGRAM_CLIENT_SECRET');

      if (!clientSecret) {
        throw new Error('Instagram client secret not configured');
      }

      const params = new URLSearchParams({
        grant_type: 'ig_refresh_token',
        access_token: refreshToken,
      });

      const response = await fetch('https://graph.instagram.com/refresh_access_token', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const urlWithParams = `https://graph.instagram.com/refresh_access_token?${params.toString()}`;
      const refreshResponse = await fetch(urlWithParams);

      const data = await refreshResponse.json();

      if (!refreshResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Token refresh failed', details: data }),
          {
            status: refreshResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Instagram OAuth error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});