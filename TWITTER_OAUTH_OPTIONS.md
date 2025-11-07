# Twitter OAuth Configuration Options

This application supports two methods for Twitter OAuth authentication:

## Option 1: Custom OAuth Flow (Current Default)

The current implementation uses a custom OAuth 2.0 PKCE flow that:
- Provides full control over the OAuth process
- Uses Twitter's OAuth 2.0 API directly
- Handles token exchange via Supabase Edge Function
- **Scopes configured**: `tweet.read tweet.write users.read offline.access`

### Configuration
Located in: `/src/services/oauth.ts`

```typescript
twitter: () => ({
  clientId: 'MmY2aUd1RXh6YUg2eFFBWWNqeXg6MTpjaQ',
  redirectUri: getRedirectUri('twitter'),
  authorizationUrl: 'https://twitter.com/i/oauth2/authorize',
  tokenUrl: 'https://api.twitter.com/2/oauth2/token',
  scope: 'tweet.read tweet.write users.read offline.access',
})
```

## Option 2: Supabase Native OAuth (Alternative)

You can also use Supabase's built-in Twitter OAuth provider:

### Setup Steps

1. **Configure Twitter Provider in Supabase Dashboard**:
   - Go to Authentication > Providers
   - Enable Twitter
   - Add your Twitter Client ID and Client Secret
   - Set callback URL to match your app

2. **Enable in your app**:
   Add this to your `.env` file:
   ```
   VITE_USE_SUPABASE_TWITTER_OAUTH=true
   ```

3. **Code automatically uses Supabase OAuth**:
   The app will detect this setting and use:
   ```typescript
   await supabase.auth.signInWithOAuth({
     provider: 'twitter',
     options: {
       scopes: 'tweet.read tweet.write users.read offline.access',
     }
   });
   ```

### Benefits of Each Approach

**Custom OAuth Flow (Current)**:
- ✅ Full control over token storage
- ✅ Can customize redirect handling
- ✅ Direct access to refresh tokens
- ✅ Works without Supabase Auth provider setup

**Supabase Native OAuth**:
- ✅ Simpler configuration
- ✅ Integrated with Supabase Auth
- ✅ Automatic token refresh by Supabase
- ✅ Built-in security best practices

## Current Status

✅ **Twitter OAuth scopes are correctly configured** for posting tweets:
- `tweet.read` - Read tweets
- `tweet.write` - **Post tweets (required for publishing)**
- `users.read` - Read user profile
- `offline.access` - Get refresh token for long-term access

✅ **Access tokens are fetched from database** when publishing posts

✅ **Webhook receives**: content, userId, taskId, mediaUrls, scheduledFor, **accessToken**, refreshToken, accountHandle

## Recommendation

The current **Custom OAuth Flow** is recommended because:
1. Already fully implemented and tested
2. Provides direct control over token management
3. Works seamlessly with your n8n webhook
4. No additional Supabase configuration needed

The Supabase Native OAuth option is available as an alternative if you prefer tighter integration with Supabase Auth.
