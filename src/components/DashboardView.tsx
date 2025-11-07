import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { fetchUserPosts } from '../services/socialMediaAPI';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { PerformanceGraph } from './PerformanceGraph';
import { TrendingHashtags } from './TrendingHashtags';
import {
  TrendingUp,
  Calendar,
  FileText,
  Users,
  Loader2,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Flame,
  Clock,
  Send,
  Edit,
  Trash2,
  Copy,
  RefreshCw
} from 'lucide-react';

interface Stats {
  totalPosts: number;
  scheduledPosts: number;
  connectedAccounts: number;
  avgEngagement: number;
}

export function DashboardView() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalPosts: 0,
    scheduledPosts: 0,
    connectedAccounts: 0,
    avgEngagement: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      window.dispatchEvent(new Event('refreshNotifications'));
    }

    const handleRefresh = () => {
      if (user) {
        loadDashboardData();
      }
    };

    window.addEventListener('refreshDashboard', handleRefresh);

    return () => {
      window.removeEventListener('refreshDashboard', handleRefresh);
    };
  }, [user]);

  const handleCopyContent = async (content: string, postId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(postId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy content to clipboard');
    }
  };

  const loadDashboardData = async () => {
    try {
      await fetchUserPosts(user!.id);

      const [socialPostsData, postsData, accountsData, analyticsData, fullAnalyticsData] = await Promise.all([
        supabase
          .from('social_posts')
          .select('*')
          .eq('user_id', user!.id)
          .order('posted_at', { ascending: false })
          .limit(5),
        supabase
          .from('content_posts')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('social_accounts')
          .select('*')
          .eq('user_id', user!.id)
          .eq('is_connected', true),
        supabase
          .from('analytics')
          .select('engagement_rate')
          .eq('user_id', user!.id),
        supabase
          .from('analytics')
          .select('*')
          .eq('user_id', user!.id)
          .order('collected_at', { ascending: false })
          .limit(30),
      ]);

      const scheduledCount = postsData.data?.filter(
        (p) => p.status === 'scheduled'
      ).length || 0;

      const avgEng =
        analyticsData.data && analyticsData.data.length > 0
          ? analyticsData.data.reduce((acc, curr) => acc + (curr.engagement_rate || 0), 0) /
            analyticsData.data.length
          : 0;

      const totalPublishedPosts = (socialPostsData.data?.length || 0) + (postsData.data?.filter(p => p.status === 'published').length || 0);

      setStats({
        totalPosts: totalPublishedPosts,
        scheduledPosts: scheduledCount,
        connectedAccounts: accountsData.data?.length || 0,
        avgEngagement: avgEng,
      });

      const draftPosts = (postsData.data?.filter(p => p.status === 'draft').slice(0, 3) || []).map(post => ({
        id: post.id,
        platform: post.platforms?.[0] || 'draft',
        content: post.content,
        posted_at: post.created_at,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        engagement_rate: 0,
        isDraft: true,
        task_name: post.task_name,
      }));

      const allRecentPosts = [...draftPosts, ...(socialPostsData.data || [])].slice(0, 5);

      setRecentPosts(allRecentPosts);
      setAnalytics(fullAnalyticsData.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDemoData = async () => {
    setGenerating(true);
    try {
      const platforms = ['twitter', 'linkedin', 'instagram', 'facebook'];
      const demoData = [];

      for (let i = 0; i < 30; i++) {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const date = new Date();
        date.setDate(date.getDate() - i);

        demoData.push({
          user_id: user!.id,
          platform,
          likes: Math.floor(Math.random() * 500) + 50,
          comments: Math.floor(Math.random() * 100) + 10,
          shares: Math.floor(Math.random() * 50) + 5,
          views: Math.floor(Math.random() * 2000) + 500,
          engagement_rate: parseFloat((Math.random() * 10 + 2).toFixed(2)),
          collected_at: date.toISOString(),
          recorded_at: date.toISOString(),
        });
      }

      const { error: deleteError } = await supabase.from('analytics').delete().eq('user_id', user!.id);
      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      const { error: insertError } = await supabase.from('analytics').insert(demoData);
      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      await loadDashboardData();
    } catch (error) {
      console.error('Error generating demo data:', error);
      alert('Failed to generate demo data. Please check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Posts',
      value: stats.totalPosts,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      title: 'Scheduled',
      value: stats.scheduledPosts,
      icon: Calendar,
      color: 'bg-green-500',
    },
    {
      title: 'Connected Accounts',
      value: stats.connectedAccounts,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      title: 'Avg Engagement',
      value: `${stats.avgEngagement.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here's your overview</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mb-8">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceGraph data={analytics} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Recent Posts</CardTitle>
            </CardHeader>
            <CardContent>
              {recentPosts.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No posts yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Connect your social accounts to see your posts here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentPosts.map((post) => {
                    const PlatformIcon = getPlatformIcon(post.platform);
                    const platformColor = getPlatformColor(post.platform);

                    return (
                      <div
                        key={post.id}
                        className={`p-5 border rounded-xl hover:border-primary-300 dark:hover:border-[#3a3456] transition-all duration-300 ${
                          post.isDraft
                            ? 'border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/10'
                            : 'border-gray-200 dark:border-[#2a2538] bg-white dark:bg-[#1f1b2e]'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {post.isDraft ? (
                              <>
                                <div className="bg-yellow-500 p-1.5 rounded flex items-center gap-1.5">
                                  <Edit className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded">
                                  Draft
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {new Date(post.posted_at).toLocaleDateString()}
                                </span>
                              </>
                            ) : (
                              <>
                                <div className={`${platformColor} p-1.5 rounded`}>
                                  <PlatformIcon className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                  {post.platform}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {new Date(post.posted_at).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => handleCopyContent(post.content, post.id)}
                            className="p-1.5 hover:bg-primary-50 dark:hover:bg-[#28243a] rounded transition-colors relative group"
                            title={copiedId === post.id ? 'Copied!' : 'Copy'}
                          >
                            <Copy className={`w-4 h-4 transition-colors ${
                              copiedId === post.id
                                ? 'text-success'
                                : 'text-gray-500 dark:text-[#8a7fa3] group-hover:text-primary-600 dark:group-hover:text-[#b8aaff]'
                            }`} />
                            {copiedId === post.id && (
                              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                Copied!
                              </span>
                            )}
                          </button>
                        </div>

                        {post.task_name && post.isDraft && (
                          <div className="mb-2">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {post.task_name}
                            </span>
                          </div>
                        )}

                        {post.media_url && (
                          <div className="mb-3 rounded-lg overflow-hidden">
                            <img
                              src={post.media_url}
                              alt="Post media"
                              className="w-full h-48 object-cover"
                            />
                          </div>
                        )}

                        <p className="text-sm text-gray-900 dark:text-[#b8aaff] leading-relaxed mb-3">{post.content}</p>

                        {post.isDraft ? (
                          <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-300">
                            <Clock className="w-3 h-3" />
                            <span>Saved as draft - Edit in Workspace</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {post.likes_count} likes
                            </span>
                            <span>{post.comments_count} comments</span>
                            {post.shares_count > 0 && <span>{post.shares_count} shares</span>}
                            {post.engagement_rate > 0 && (
                              <span className="ml-auto font-medium text-green-600 dark:text-green-400">
                                {post.engagement_rate.toFixed(1)}% engagement
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'twitter':
      return Twitter;
    case 'linkedin':
      return Linkedin;
    case 'instagram':
      return Instagram;
    case 'facebook':
      return Facebook;
    default:
      return TrendingUp;
  }
};

const getPlatformColor = (platform: string) => {
  switch (platform) {
    case 'twitter':
      return 'bg-blue-500';
    case 'linkedin':
      return 'bg-blue-700';
    case 'instagram':
      return 'bg-gradient-to-br from-purple-600 to-pink-600';
    case 'facebook':
      return 'bg-blue-600';
    default:
      return 'bg-gray-500';
  }
};
