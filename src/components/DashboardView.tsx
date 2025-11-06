import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { fetchUserPosts } from '../services/socialMediaAPI';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
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
  Copy
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

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
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

      const [socialPostsData, postsData, accountsData, analyticsData] = await Promise.all([
        supabase
          .from('social_posts')
          .select('*')
          .eq('user_id', user!.id)
          .order('posted_at', { ascending: false })
          .limit(10),
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
          .from('analytics_data')
          .select('engagement_rate')
          .eq('user_id', user!.id),
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

      setRecentPosts(socialPostsData.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here's your overview</p>
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
                        className="p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg transition-all duration-300 bg-white dark:bg-gray-800"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`${platformColor} p-1.5 rounded`}>
                              <PlatformIcon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {post.platform}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {new Date(post.posted_at).toLocaleDateString()}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopyContent(post.content, post.id)}
                            className="p-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors relative group"
                            title={copiedId === post.id ? 'Copied!' : 'Copy'}
                          >
                            <Copy className={`w-4 h-4 transition-colors ${
                              copiedId === post.id
                                ? 'text-success'
                                : 'text-gray-500 dark:text-gray-400 group-hover:text-primary-600'
                            }`} />
                            {copiedId === post.id && (
                              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                Copied!
                              </span>
                            )}
                          </button>
                        </div>

                        {post.media_url && (
                          <div className="mb-3 rounded-lg overflow-hidden">
                            <img
                              src={post.media_url}
                              alt="Post media"
                              className="w-full h-48 object-cover"
                            />
                          </div>
                        )}

                        <p className="text-sm text-gray-900 dark:text-gray-200 leading-relaxed mb-3">{post.content}</p>

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
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {post.status === 'draft' && (
                          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-xs font-medium rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-300 hover:shadow-md">
                            <Send className="w-3 h-3" />
                            Publish Now
                          </button>
                        )}
                      </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <Flame className="w-5 h-5 text-orange-500" />
                Trending Now
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trendingTopics.map((trend, index) => {
                  const Icon = getPlatformIcon(trend.platform);
                  return (
                    <div
                      key={index}
                      className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          #{trend.topic}
                        </h4>
                        <div className={`${getPlatformColor(trend.platform)} p-1.5 rounded`}>
                          <Icon className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {trend.description}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">{trend.posts} posts</span>
                        <span className="text-orange-600 font-medium flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {trend.growth}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const trendingTopics = [
  {
    topic: 'AIRevolution',
    platform: 'twitter',
    description: 'Latest developments in artificial intelligence and machine learning',
    posts: '125K',
    growth: '+45%',
  },
  {
    topic: 'SustainableLiving',
    platform: 'instagram',
    description: 'Eco-friendly lifestyle tips and sustainable product recommendations',
    posts: '89K',
    growth: '+32%',
  },
  {
    topic: 'TechInnovation',
    platform: 'linkedin',
    description: 'Breakthrough technologies and industry innovations',
    posts: '67K',
    growth: '+28%',
  },
  {
    topic: 'WorkFromHome',
    platform: 'facebook',
    description: 'Remote work tips, productivity hacks, and home office setups',
    posts: '54K',
    growth: '+22%',
  },
  {
    topic: 'DigitalMarketing',
    platform: 'twitter',
    description: 'Latest trends in digital marketing and social media strategy',
    posts: '43K',
    growth: '+18%',
  },
];

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
