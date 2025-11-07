import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { PerformanceGraph } from './PerformanceGraph';
import { TrendingHashtags } from './TrendingHashtags';
import { TrendingUp, Heart, MessageCircle, Share2, Eye, Loader2, Twitter, Linkedin, Instagram, Facebook, Flame, RefreshCw } from 'lucide-react';

type Platform = 'all' | 'twitter' | 'linkedin' | 'instagram' | 'facebook';
type TimeRange = '1d' | '1w' | '1m' | '6m' | '1y' | 'all';

export function AnalyticsView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('1m');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('analytics')
        .select('*')
        .eq('user_id', user!.id)
        .order('collected_at', { ascending: false });

      if (error) throw error;
      setAnalytics(data || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDemoData = async () => {
    setGenerating(true);
    try {
      let { data: socialAccounts } = await supabase
        .from('social_accounts')
        .select('id, platform')
        .eq('user_id', user!.id)
        .eq('is_active', true);

      if (!socialAccounts || socialAccounts.length === 0) {
        const defaultAccounts = [
          { platform: 'twitter', account_name: 'Demo Twitter', account_handle: '@demo_twitter' },
          { platform: 'facebook', account_name: 'Demo Facebook', account_handle: 'demo.facebook' },
          { platform: 'instagram', account_name: 'Demo Instagram', account_handle: '@demo_insta' },
          { platform: 'linkedin', account_name: 'Demo LinkedIn', account_handle: 'demo-linkedin' },
        ];

        const { data: newAccounts } = await supabase
          .from('social_accounts')
          .insert(
            defaultAccounts.map(acc => ({
              user_id: user!.id,
              ...acc,
              is_active: true
            }))
          )
          .select('id, platform');

        socialAccounts = newAccounts || [];
      }

      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('user_id', user!.id);

      if (deleteError) {
        console.error('Delete posts error:', deleteError);
      }

      const demoPostsData = [];
      const postContents = [
        'Just launched our new product! 🚀 Check it out. #ProductLaunch #Innovation',
        'Behind the scenes of our creative process 🎨 #BehindTheScenes',
        'Top 5 tips for growing your business in 2025 #BusinessTips',
        'Customer success story: How we helped achieve 300% growth #Success',
        'Excited to share our latest milestone! Thank you for your support 🎉',
        'New blog post: The future of automation #ContentMarketing',
        'Team spotlight: Meet our amazing developers 👥 #TeamCulture',
        'Product update: New features you will love ⚡ #ProductUpdate',
      ];

      for (const account of socialAccounts) {
        for (let i = 0; i < 90; i++) {
          const daysAgo = i;
          const publishDate = new Date();
          publishDate.setDate(publishDate.getDate() - daysAgo);

          demoPostsData.push({
            user_id: user!.id,
            social_account_id: account.id,
            platform: account.platform,
            content: postContents[i % postContents.length],
            status: 'published',
            published_at: publishDate.toISOString(),
            post_id_on_platform: `demo_${account.platform}_${i}_${Date.now()}`,
          });
        }
      }

      const { data: newPosts, error: postsError } = await supabase
        .from('posts')
        .insert(demoPostsData)
        .select('id, social_account_id, platform, published_at');

      if (postsError) {
        console.error('Error creating posts:', postsError);
        throw postsError;
      }

      const { error: deleteAnalyticsError } = await supabase
        .from('analytics')
        .delete()
        .eq('user_id', user!.id);

      if (deleteAnalyticsError) {
        console.error('Delete analytics error:', deleteAnalyticsError);
      }

      const demoAnalytics = newPosts
        .filter(post => post.id && post.social_account_id && post.platform)
        .map((post) => {
          const baseImpressions = Math.floor(Math.random() * 5000) + 1000;
          const likes = Math.floor(baseImpressions * (Math.random() * 0.05 + 0.02));
          const comments = Math.floor(likes * (Math.random() * 0.3 + 0.1));
          const shares = Math.floor(likes * (Math.random() * 0.2 + 0.05));
          const clicks = Math.floor(baseImpressions * (Math.random() * 0.03 + 0.01));
          const totalEngagement = likes + comments + shares + clicks;
          const engagementRate = (totalEngagement / baseImpressions) * 100;

          return {
            post_id: post.id,
            user_id: user!.id,
            social_account_id: post.social_account_id,
            platform: post.platform,
            impressions: baseImpressions,
            likes,
            comments,
            shares,
            clicks,
            engagement_rate: parseFloat(engagementRate.toFixed(2)),
            collected_at: post.published_at,
          };
        });

      const { error: insertError } = await supabase
        .from('analytics')
        .insert(demoAnalytics);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      await loadAnalytics();
      alert(`Successfully generated demo data with ${demoAnalytics.length} analytics entries spanning 90 days!`);
    } catch (error) {
      console.error('Error generating demo data:', error);
      alert('Failed to generate demo data. Please check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  const getDateRangeFilter = (range: TimeRange) => {
    const now = new Date();
    const cutoffDate = new Date();

    switch (range) {
      case '1d':
        cutoffDate.setDate(now.getDate() - 1);
        break;
      case '1w':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '1m':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '6m':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        return new Date(0);
    }

    return cutoffDate;
  };

  const filteredAnalytics = analytics.filter(a => {
    const matchesPlatform = selectedPlatform === 'all' || a.platform === selectedPlatform;
    const matchesTimeRange = new Date(a.collected_at) >= getDateRangeFilter(selectedTimeRange);
    return matchesPlatform && matchesTimeRange;
  });

  const totalMetrics = filteredAnalytics.reduce(
    (acc, curr) => ({
      likes: acc.likes + (curr.likes || 0),
      comments: acc.comments + (curr.comments || 0),
      shares: acc.shares + (curr.shares || 0),
      views: acc.views + (curr.impressions || 0),
    }),
    { likes: 0, comments: 0, shares: 0, views: 0 }
  );

  const platforms = [
    { id: 'all' as Platform, name: 'All Platforms', icon: TrendingUp },
    { id: 'twitter' as Platform, name: 'Twitter', icon: Twitter },
    { id: 'linkedin' as Platform, name: 'LinkedIn', icon: Linkedin },
    { id: 'instagram' as Platform, name: 'Instagram', icon: Instagram },
    { id: 'facebook' as Platform, name: 'Facebook', icon: Facebook },
  ];

  const timeRanges = [
    { id: '1d' as TimeRange, label: '1 Day' },
    { id: '1w' as TimeRange, label: '1 Week' },
    { id: '1m' as TimeRange, label: '1 Month' },
    { id: '6m' as TimeRange, label: '6 Months' },
    { id: '1y' as TimeRange, label: '1 Year' },
    { id: 'all' as TimeRange, label: 'Overall' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track your social media performance</p>
        </div>
        <Button
          onClick={generateDemoData}
          disabled={generating}
          className="dark:bg-[#7b6cff] dark:hover:bg-[#6b5cef]"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate Demo Data
            </>
          )}
        </Button>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            const isActive = selectedPlatform === platform.id;
            return (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatform(platform.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 dark:bg-[#7b6cff] text-white'
                    : 'bg-white dark:bg-[#1f1b2e] text-gray-700 dark:text-[#a39bba] border border-gray-200 dark:border-[#2a2538] hover:border-blue-300 dark:hover:border-[#3a3456] hover:bg-blue-50 dark:hover:bg-[#28243a]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {platform.name}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {timeRanges.map((range) => {
            const isActive = selectedTimeRange === range.id;
            return (
              <button
                key={range.id}
                onClick={() => setSelectedTimeRange(range.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-green-600 text-white'
                    : 'bg-white dark:bg-[#1f1b2e] text-gray-700 dark:text-[#a39bba] border border-gray-200 dark:border-[#2a2538] hover:border-green-300 dark:hover:border-[#3a3456] hover:bg-green-50 dark:hover:bg-[#28243a]'
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Likes</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {totalMetrics.likes.toLocaleString()}
                </p>
              </div>
              <div className="bg-red-500 p-3 rounded-lg">
                <Heart className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Comments</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {totalMetrics.comments.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-500 p-3 rounded-lg">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Shares</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {totalMetrics.shares.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-500 p-3 rounded-lg">
                <Share2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {totalMetrics.views.toLocaleString()}
                </p>
              </div>
              <div className="bg-cyan-500 p-3 rounded-lg">
                <Eye className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceGraph data={filteredAnalytics} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Post Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAnalytics.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No analytics yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {selectedPlatform === 'all'
                      ? 'Publish posts to start tracking your performance'
                      : `No data available for ${platforms.find(p => p.id === selectedPlatform)?.name}`}
                  </p>
                  <Button
                    onClick={generateDemoData}
                    disabled={generating}
                    className="dark:bg-[#7b6cff] dark:hover:bg-[#6b5cef]"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Demo Data'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAnalytics.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 border border-gray-200 dark:border-[#2a2538] rounded-lg hover:bg-gray-50 dark:hover:bg-[#28243a] transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded capitalize">
                          {item.platform}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(item.collected_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Likes</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{item.likes}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Comments</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{item.comments}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Shares</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{item.shares}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Views</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{item.impressions || 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <TrendingHashtags />
        </div>
      </div>
    </div>
  );
}
