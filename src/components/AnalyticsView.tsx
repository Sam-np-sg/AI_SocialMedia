import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { PerformanceGraph } from './PerformanceGraph';
import { TrendingHashtags } from './TrendingHashtags';
import { TrendingUp, Heart, MessageCircle, Share2, Eye, Loader2, Twitter, Linkedin, Instagram, Facebook, Flame, RefreshCw } from 'lucide-react';

type Platform = 'all' | 'twitter' | 'linkedin' | 'instagram' | 'facebook';

export function AnalyticsView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('all');
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
        .order('collected_at', { ascending: false })
        .limit(30);

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

      await loadAnalytics();
    } catch (error) {
      console.error('Error generating demo data:', error);
      alert('Failed to generate demo data. Please check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  const filteredAnalytics = selectedPlatform === 'all'
    ? analytics
    : analytics.filter(a => a.platform === selectedPlatform);

  const totalMetrics = filteredAnalytics.reduce(
    (acc, curr) => ({
      likes: acc.likes + curr.likes,
      comments: acc.comments + curr.comments,
      shares: acc.shares + curr.shares,
      views: acc.views + curr.views,
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

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
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
                          {new Date(item.recorded_at || item.collected_at).toLocaleDateString()}
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
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{item.views}</p>
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
