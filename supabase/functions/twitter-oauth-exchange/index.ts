import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TWITTER_CLIENT_SECRET = 'AE6RHyeqmg0fuXZkVMMAgmEAcrTObGN77q1XsuYsvpNSTG6ky9';

interface TokenRequest {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  clientId: string;
}

interface RefreshTokenRequest {
  refreshToken: string;
  clientId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'exchange';

    if (action === 'user-info') {
      // Fetch Twitter user info
      const authHeader = req.headers.get('Authorization');
      
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      const response = await fetch('https://api.twitter.com/2/users/me', {
        headers: {
          'Authorization': authHeader,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: data }),
          {
            status: response.status,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return new Response(
        JSON.stringify(data),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } else if (action === 'exchange') {
      // Exchange authorization code for tokens
      const body: TokenRequest = await req.json();

      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code: body.code,
        redirect_uri: body.redirectUri,
        client_id: body.clientId,
        code_verifier: body.codeVerifier,
      });

      const authHeader = btoa(`${body.clientId}:${TWITTER_CLIENT_SECRET}`);

      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`,
        },
        body: tokenParams.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: data }),
          {
            status: response.status,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return new Response(
        JSON.stringify(data),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } else if (action === 'refresh') {
      // Refresh access token
      const body: RefreshTokenRequest = await req.json();

      const tokenParams = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: body.refreshToken,
        client_id: body.clientId,
      });

      const authHeader = btoa(`${body.clientId}:${TWITTER_CLIENT_SECRET}`);

      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`,
        },
        body: tokenParams.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: data }),
          {
            status: response.status,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return new Response(
        JSON.stringify(data),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});