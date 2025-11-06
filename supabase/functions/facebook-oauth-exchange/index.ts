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
      const { code, redirectUri, clientId } = await req.json();
      const clientSecret = Deno.env.get('FACEBOOK_CLIENT_SECRET');

      if (!clientSecret) {
        throw new Error('Facebook client secret not configured');
      }

      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      });

      const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`, {
        method: 'GET',
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
      const { clientId } = await req.json();
      const clientSecret = Deno.env.get('FACEBOOK_CLIENT_SECRET');

      if (!clientSecret) {
        throw new Error('Facebook client secret not configured');
      }

      const params = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: clientId,
        client_secret: clientSecret,
        fb_exchange_token: 'short_lived_token',
      });

      const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`, {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Token refresh failed', details: data }),
          {
            status: response.status,
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
    console.error('Facebook OAuth error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});