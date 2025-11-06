import { supabase } from '../lib/supabase';

export const generateDemoAnalytics = async (userId: string) => {
  try {
    // First, get user's social accounts
    const { data: socialAccounts } = await supabase
      .from('social_accounts')
      .select('id, platform')
      .eq('user_id', userId)
      .limit(1);

    if (!socialAccounts || socialAccounts.length === 0) {
      throw new Error('Please connect at least one social account first');
    }

    const socialAccount = socialAccounts[0];

    // Create demo posts with varying metrics over the last 30 days
    const demoPosts = [];
    const demoAnalytics = [];
    const platforms = ['twitter', 'linkedin', 'instagram', 'facebook'];

    for (let i = 0; i < 15; i++) {
      const daysAgo = i * 2;
      const publishedAt = new Date();
      publishedAt.setDate(publishedAt.getDate() - daysAgo);

      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const baseMetric = 50 + Math.floor(Math.random() * 200);

      const postContent = [
        'Excited to share our latest insights on digital transformation! 🚀',
        'Just launched a new feature that will revolutionize your workflow ✨',
        'Monday motivation: Keep pushing forward, great things take time 💪',
        'Behind the scenes of our team working on amazing projects 🎯',
        'Check out this incredible case study from our recent project 📊',
        'Tips and tricks for productivity in the digital age 💡',
        'Celebrating another milestone with our amazing community! 🎉',
        'Industry trends you need to know about right now 📈',
        'Collaboration is key to success in any venture 🤝',
        'Innovation happens when creativity meets technology ⚡',
        'Customer success story: How we helped achieve 10x growth 🌟',
        'Weekend vibes: Reflecting on an incredible week 🌅',
        'New blog post: Essential strategies for modern businesses 📝',
        'Product update: We listened to your feedback! 🎊',
        'Join us for an upcoming webinar on industry best practices 🎓'
      ][i % 15];

      demoPosts.push({
        user_id: userId,
        social_account_id: socialAccount.id,
        content: postContent,
        platform: platform,
        status: 'published',
        published_at: publishedAt.toISOString(),
        created_at: publishedAt.toISOString(),
      });
    }

    // Insert posts
    const { data: insertedPosts, error: postError } = await supabase
      .from('posts')
      .insert(demoPosts)
      .select();

    if (postError) throw postError;

    // Create analytics for each post
    if (insertedPosts) {
      for (let i = 0; i < insertedPosts.length; i++) {
        const post = insertedPosts[i];
        const daysAgo = i * 2;

        // More recent posts have higher engagement
        const recencyBoost = 1 + (15 - i) * 0.1;
        const baseImpressions = Math.floor((500 + Math.random() * 1500) * recencyBoost);
        const baseLikes = Math.floor((20 + Math.random() * 150) * recencyBoost);
        const baseComments = Math.floor((5 + Math.random() * 40) * recencyBoost);
        const baseShares = Math.floor((3 + Math.random() * 30) * recencyBoost);

        const engagement = baseLikes + baseComments + baseShares;
        const engagementRate = baseImpressions > 0
          ? ((engagement / baseImpressions) * 100).toFixed(2)
          : '0.00';

        demoAnalytics.push({
          post_id: post.id,
          user_id: userId,
          social_account_id: post.social_account_id,
          platform: post.platform,
          impressions: baseImpressions,
          likes: baseLikes,
          comments: baseComments,
          shares: baseShares,
          clicks: Math.floor(baseImpressions * 0.05),
          engagement_rate: parseFloat(engagementRate),
          collected_at: post.published_at,
          created_at: post.published_at,
        });
      }

      const { error: analyticsError } = await supabase
        .from('analytics')
        .insert(demoAnalytics);

      if (analyticsError) throw analyticsError;
    }

    return { success: true, count: demoPosts.length };
  } catch (error: any) {
    console.error('Error generating demo analytics:', error);
    throw error;
  }
};

export const clearDemoAnalytics = async (userId: string) => {
  try {
    // Delete analytics first (foreign key constraint)
    await supabase
      .from('analytics')
      .delete()
      .eq('user_id', userId);

    // Then delete posts
    await supabase
      .from('posts')
      .delete()
      .eq('user_id', userId);

    return { success: true };
  } catch (error: any) {
    console.error('Error clearing demo analytics:', error);
    throw error;
  }
};
