import { getValidToken } from './tokenManager';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';

export interface PostContent {
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

export interface PostResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

async function postToTwitter(
  accessToken: string ,
  content: PostContent
): Promise<PostResult> {
  try {
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: content.text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to post to Twitter');
    }

    const data = await response.json();
    return {
      success: true,
      postId: data.data.id,
      postUrl: `https://twitter.com/i/web/status/${data.data.id}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function postToLinkedIn(
  accessToken: string,
  content: PostContent,
  userId: string
): Promise<PostResult> {
  try {
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: `urn:li:person:${userId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content.text,
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to post to LinkedIn');
    }

    const data = await response.json();
    return {
      success: true,
      postId: data.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function postToFacebook(
  accessToken: string,
  content: PostContent,
  pageId: string
): Promise<PostResult> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/feed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content.text,
          access_token: accessToken,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to post to Facebook');
    }

    const data = await response.json();
    return {
      success: true,
      postId: data.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function postToInstagram(
  accessToken: string,
  content: PostContent,
  accountId: string
): Promise<PostResult> {
  try {
    if (!content.mediaUrl) {
      throw new Error('Instagram posts require an image or video');
    }

    const createResponse = await fetch(
      `https://graph.instagram.com/v18.0/${accountId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: content.mediaUrl,
          caption: content.text,
          access_token: accessToken,
        }),
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(error.error?.message || 'Failed to create Instagram media');
    }

    const createData = await createResponse.json();
    const creationId = createData.id;

    const publishResponse = await fetch(
      `https://graph.instagram.com/v18.0/${accountId}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      throw new Error(error.error?.message || 'Failed to publish Instagram post');
    }

    const publishData = await publishResponse.json();
    return {
      success: true,
      postId: publishData.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function publishPost(
  accountId: string,
  content: PostContent
): Promise<PostResult> {
  try {
    const { data: account, error } = await supabase
      .from('social_accounts')
      .select('platform, account_handle')
      .eq('id', accountId)
      .maybeSingle();

    if (error || !account) {
      throw new Error('Account not found');
    }

    const accessToken = await getValidToken(accountId, account.platform);

    let result: PostResult;

    switch (account.platform) {
      case 'twitter':
        result = await postToTwitter(accessToken, content);
        break;
      case 'linkedin':
        result = await postToLinkedIn(accessToken, content, account.account_handle);
        break;
      case 'facebook':
        result = await postToFacebook(accessToken, content, account.account_handle);
        break;
      case 'instagram':
        result = await postToInstagram(accessToken, content, account.account_handle);
        break;
      default:
        result = {
          success: false,
          error: `Unsupported platform: ${account.platform}`,
        };
    }

    if (result.success) {
      await supabase.from('posts').insert({
        account_id: accountId,
        content: content.text,
        media_url: content.mediaUrl,
        status: 'published',
        published_at: new Date().toISOString(),
        external_post_id: result.postId,
      });
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to publish post',
    };
  }
}

export async function publishToMultipleAccounts(
  accountIds: string[],
  content: PostContent
): Promise<{ accountId: string; result: PostResult }[]> {
  const results = await Promise.all(
    accountIds.map(async (accountId) => ({
      accountId,
      result: await publishPost(accountId, content),
    }))
  );

  return results;
}

export interface VerifyUsernameResult {
  exists: boolean;
  username?: string;
  displayName?: string;
  profileUrl?: string;
  error?: string;
}

export async function verifyTwitterUsername(username: string): Promise<VerifyUsernameResult> {
  try {
    const cleanUsername = username.replace('@', '');
    const twitterBearerToken = import.meta.env.VITE_TWITTER_BEARER_TOKEN;

    const apiUrl = `${supabaseUrl}/functions/v1/verify-twitter-username`;

    console.log('Calling edge function:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        username: cleanUsername,
        bearerToken: twitterBearerToken
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge function error:', response.status, errorText);
      throw new Error(`Edge function failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Edge function response:', data);
    return data;
  } catch (error: any) {
    console.error('verifyTwitterUsername error:', error);
    return {
      exists: false,
      error: error.message || 'Failed to verify username',
    };
  }
}

export async function verifyLinkedInProfile(profileUrl: string): Promise<VerifyUsernameResult> {
  try {
    const response = await fetch('https://api.linkedin.com/v2/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_LINKEDIN_ACCESS_TOKEN || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to verify LinkedIn profile');
    }

    const data = await response.json();
    return {
      exists: true,
      username: data.id,
      displayName: `${data.localizedFirstName} ${data.localizedLastName}`,
      profileUrl: profileUrl,
    };
  } catch (error: any) {
    return {
      exists: false,
      error: error.message || 'Failed to verify LinkedIn profile',
    };
  }
}

export async function verifyFacebookPage(pageId: string): Promise<VerifyUsernameResult> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=id,name,username&access_token=${import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN || ''}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          exists: false,
          error: 'Page not found on Facebook',
        };
      }
      throw new Error('Failed to verify Facebook page');
    }

    const data = await response.json();
    return {
      exists: true,
      username: data.username || data.id,
      displayName: data.name,
      profileUrl: `https://facebook.com/${data.username || data.id}`,
    };
  } catch (error: any) {
    return {
      exists: false,
      error: error.message || 'Failed to verify Facebook page',
    };
  }
}

export async function verifyInstagramAccount(username: string): Promise<VerifyUsernameResult> {
  try {
    const cleanUsername = username.replace('@', '');

    const response = await fetch(
      `https://graph.instagram.com/v18.0/me?fields=id,username&access_token=${import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN || ''}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to verify Instagram account');
    }

    const data = await response.json();
    if (data.username.toLowerCase() !== cleanUsername.toLowerCase()) {
      return {
        exists: false,
        error: 'Username does not match authenticated account',
      };
    }

    return {
      exists: true,
      username: data.username,
      displayName: data.username,
      profileUrl: `https://instagram.com/${data.username}`,
    };
  } catch (error: any) {
    return {
      exists: false,
      error: error.message || 'Failed to verify Instagram account',
    };
  }
}

export async function verifyUsername(platform: string, username: string): Promise<VerifyUsernameResult> {
  switch (platform) {
    case 'twitter':
      return verifyTwitterUsername(username);
    case 'linkedin':
      return verifyLinkedInProfile(username);
    case 'facebook':
      return verifyFacebookPage(username);
    case 'instagram':
      return verifyInstagramAccount(username);
    default:
      return {
        exists: false,
        error: `Platform ${platform} is not supported for verification`,
      };
  }
}

export interface SocialPost {
  id: string;
  platform: string;
  postId: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  engagementRate: number;
  postedAt: string;
}

async function fetchTwitterPosts(accountId: string): Promise<SocialPost[]> {
  try {
    const accessToken = await getValidToken(accountId, 'twitter');

    const response = await fetch('https://api.twitter.com/2/tweets/search/recent?query=from:me&max_results=10&tweet.fields=created_at,public_metrics,attachments', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Twitter posts');
    }

    const data = await response.json();

    return (data.data || []).map((tweet: any) => ({
      id: tweet.id,
      platform: 'twitter',
      postId: tweet.id,
      content: tweet.text,
      likesCount: tweet.public_metrics?.like_count || 0,
      commentsCount: tweet.public_metrics?.reply_count || 0,
      sharesCount: tweet.public_metrics?.retweet_count || 0,
      engagementRate: calculateEngagement(tweet.public_metrics),
      postedAt: tweet.created_at,
    }));
  } catch (error) {
    console.error('Error fetching Twitter posts:', error);
    return [];
  }
}

async function fetchFacebookPosts(accountId: string, pageId: string): Promise<SocialPost[]> {
  try {
    const accessToken = await getValidToken(accountId, 'facebook');

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/posts?fields=id,message,created_time,attachments,likes.summary(true),comments.summary(true),shares&limit=10&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Facebook posts');
    }

    const data = await response.json();

    return (data.data || []).map((post: any) => ({
      id: post.id,
      platform: 'facebook',
      postId: post.id,
      content: post.message || '',
      mediaUrl: post.attachments?.data?.[0]?.media?.image?.src,
      mediaType: post.attachments?.data?.[0]?.type,
      likesCount: post.likes?.summary?.total_count || 0,
      commentsCount: post.comments?.summary?.total_count || 0,
      sharesCount: post.shares?.count || 0,
      engagementRate: 0,
      postedAt: post.created_time,
    }));
  } catch (error) {
    console.error('Error fetching Facebook posts:', error);
    return [];
  }
}

async function fetchInstagramPosts(accountId: string, igAccountId: string): Promise<SocialPost[]> {
  try {
    const accessToken = await getValidToken(accountId, 'instagram');

    const response = await fetch(
      `https://graph.instagram.com/v18.0/${igAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&limit=10&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Instagram posts');
    }

    const data = await response.json();

    return (data.data || []).map((post: any) => ({
      id: post.id,
      platform: 'instagram',
      postId: post.id,
      content: post.caption || '',
      mediaUrl: post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url,
      mediaType: post.media_type?.toLowerCase(),
      likesCount: post.like_count || 0,
      commentsCount: post.comments_count || 0,
      sharesCount: 0,
      engagementRate: 0,
      postedAt: post.timestamp,
    }));
  } catch (error) {
    console.error('Error fetching Instagram posts:', error);
    return [];
  }
}

function calculateEngagement(metrics: any): number {
  if (!metrics) return 0;
  const total = (metrics.like_count || 0) + (metrics.reply_count || 0) + (metrics.retweet_count || 0);
  const impressions = metrics.impression_count || 1;
  return (total / impressions) * 100;
}

export async function fetchUserPosts(userId: string): Promise<void> {
  try {
    const { data: accounts, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId);

    if (error || !accounts) {
      console.error('Error fetching accounts:', error);
      return;
    }

    for (const account of accounts) {
      let posts: SocialPost[] = [];

      switch (account.platform) {
        case 'twitter':
          posts = await fetchTwitterPosts(account.id);
          break;
        case 'facebook':
          posts = await fetchFacebookPosts(account.id, account.account_handle);
          break;
        case 'instagram':
          posts = await fetchInstagramPosts(account.id, account.account_handle);
          break;
      }

      for (const post of posts) {
        await supabase.from('social_posts').upsert({
          user_id: userId,
          social_account_id: account.id,
          platform: post.platform,
          post_id: post.postId,
          content: post.content,
          media_url: post.mediaUrl,
          media_type: post.mediaType,
          likes_count: post.likesCount,
          comments_count: post.commentsCount,
          shares_count: post.sharesCount,
          engagement_rate: post.engagementRate,
          posted_at: post.postedAt,
          fetched_at: new Date().toISOString(),
        }, {
          onConflict: 'platform,post_id'
        });
      }
    }
  } catch (error) {
    console.error('Error in fetchUserPosts:', error);
  }
}
