interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scope: string;
}

const getRedirectUri = (platform: string) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/auth/callback/${platform}`;
};

const oauthConfigs: Record<string, () => OAuthConfig> = {
  twitter: () => ({
    clientId: 'MmY2aUd1RXh6YUg2eFFBWWNqeXg6MTpjaQ',
    redirectUri: getRedirectUri('twitter'),
    authorizationUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scope: 'tweet.read tweet.write users.read offline.access',
  }),
  linkedin: () => ({
    clientId: import.meta.env.VITE_LINKEDIN_CLIENT_ID || '',
    redirectUri: getRedirectUri('linkedin'),
    authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scope: 'r_liteprofile r_emailaddress w_member_social',
  }),
  instagram: () => ({
    clientId: import.meta.env.VITE_INSTAGRAM_CLIENT_ID || '',
    redirectUri: getRedirectUri('instagram'),
    authorizationUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scope: 'user_profile,user_media',
  }),
  facebook: () => ({
    clientId: import.meta.env.VITE_FACEBOOK_CLIENT_ID || '',
    redirectUri: getRedirectUri('facebook'),
    authorizationUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,publish_to_groups',
  }),
  tiktok: () => ({
    clientId: import.meta.env.VITE_TIKTOK_CLIENT_ID || '',
    redirectUri: getRedirectUri('tiktok'),
    authorizationUrl: 'https://www.tiktok.com/auth/authorize/',
    tokenUrl: 'https://open-api.tiktok.com/oauth/access_token/',
    scope: 'user.info.basic,video.upload,video.publish',
  }),
};

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function initiateOAuth(platform: string, supabaseSession?: string): Promise<void> {
  const config = oauthConfigs[platform]?.();

  console.log('OAuth Debug:', {
    platform,
    hasConfig: !!config,
    clientId: config?.clientId || 'MISSING',
    allEnvVars: {
      twitter: import.meta.env.VITE_TWITTER_CLIENT_ID || 'NOT_SET',
      instagram: import.meta.env.VITE_INSTAGRAM_CLIENT_ID || 'NOT_SET',
    }
  });

  if (!config) {
    throw new Error(`Platform ${platform} is not supported.`);
  }

  if (!config.clientId) {
    throw new Error(`OAuth not configured for ${platform}. Please add credentials to .env file and restart the dev server.`);
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  sessionStorage.setItem(`oauth_state_${platform}`, state);
  sessionStorage.setItem(`oauth_verifier_${platform}`, codeVerifier);

  if (supabaseSession) {
    console.log('Saving Supabase session to localStorage:', {
      platform,
      hasSession: !!supabaseSession,
      sessionLength: supabaseSession.length
    });
    localStorage.setItem(`oauth_supabase_session_${platform}`, supabaseSession);
  } else {
    console.warn('No Supabase session to save for platform:', platform);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${config.authorizationUrl}?${params.toString()}`;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

export async function exchangeCodeForToken(
  platform: string,
  code: string,
  state: string
): Promise<OAuthTokenResponse> {
  const config = oauthConfigs[platform]?.();

  if (!config) {
    throw new Error(`OAuth not configured for ${platform}`);
  }

  const savedState = sessionStorage.getItem(`oauth_state_${platform}`);
  if (savedState !== state) {
    throw new Error('Invalid state parameter. Possible CSRF attack.');
  }

  const codeVerifier = sessionStorage.getItem(`oauth_verifier_${platform}`);
  if (!codeVerifier) {
    throw new Error('Code verifier not found');
  }

  // Use edge function for Twitter OAuth to avoid CORS issues
  if (platform === 'twitter') {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL is not configured');
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/twitter-oauth-exchange?action=exchange`;

    console.log('Calling edge function:', edgeFunctionUrl);

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
        redirectUri: config.redirectUri,
        codeVerifier: codeVerifier,
        clientId: config.clientId,
      }),
    });

    console.log('Edge function response status:', response.status);

    const responseText = await response.text();
    console.log('Edge function response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid JSON response from edge function: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
    }

    sessionStorage.removeItem(`oauth_state_${platform}`);
    sessionStorage.removeItem(`oauth_verifier_${platform}`);

    return data;
  }

  throw new Error(`Platform ${platform} OAuth not yet implemented. Please use Twitter for now.`);
}

export async function refreshAccessToken(
  platform: string,
  refreshToken: string
): Promise<OAuthTokenResponse> {
  const config = oauthConfigs[platform]?.();

  if (!config) {
    throw new Error(`OAuth not configured for ${platform}`);
  }

  // Use edge function for Twitter OAuth to avoid CORS issues
  if (platform === 'twitter') {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL is not configured');
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/twitter-oauth-exchange?action=refresh`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: refreshToken,
        clientId: config.clientId,
      }),
    });

    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid JSON response from edge function: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
    }

    return data;
  }

  throw new Error(`Platform ${platform} token refresh not yet implemented. Please use Twitter for now.`);
}