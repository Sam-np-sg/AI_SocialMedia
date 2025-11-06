import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Flame, TrendingUp, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface TrendingHashtag {
  id: string;
  hashtag: string;
  posts_count: number;
  growth_rate: number;
  platform: string;
  trending_url: string;
  last_updated: string;
}

interface TrendingHashtagsProps {
  platform?: string;
}

export function TrendingHashtags({ platform = 'all' }: TrendingHashtagsProps) {
  const { user } = useAuth();
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadHashtags();
    }
  }, [user, platform]);

  const loadHashtags = async () => {
    try {
      let query = supabase
        .from('trending_hashtags')
        .select('*')
        .eq('user_id', user!.id)
        .order('growth_rate', { ascending: false })
        .limit(10);

      if (platform !== 'all') {
        query = query.eq('platform', platform);
      }

      const { data, error } = await query;

      if (error) throw error;
      setHashtags(data || []);
    } catch (error) {
      console.error('Error loading trending hashtags:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDemoHashtags = async () => {
    setRefreshing(true);
    try {
      const demoHashtags = [
        { hashtag: 'AIRevolution', posts_count: 125000, growth_rate: 45.2, platform: 'twitter', url: 'https://twitter.com/search?q=%23AIRevolution' },
        { hashtag: 'SustainableLiving', posts_count: 89000, growth_rate: 32.1, platform: 'instagram', url: 'https://www.instagram.com/explore/tags/sustainableliving/' },
        { hashtag: 'TechInnovation', posts_count: 67000, growth_rate: 28.5, platform: 'linkedin', url: 'https://www.linkedin.com/feed/hashtag/techinnovation/' },
        { hashtag: 'WorkFromHome', posts_count: 54000, growth_rate: 22.3, platform: 'twitter', url: 'https://twitter.com/search?q=%23WorkFromHome' },
        { hashtag: 'DigitalMarketing', posts_count: 43000, growth_rate: 18.7, platform: 'linkedin', url: 'https://www.linkedin.com/feed/hashtag/digitalmarketing/' },
        { hashtag: 'Entrepreneurship', posts_count: 38000, growth_rate: 15.4, platform: 'twitter', url: 'https://twitter.com/search?q=%23Entrepreneurship' },
        { hashtag: 'HealthAndWellness', posts_count: 35000, growth_rate: 12.9, platform: 'instagram', url: 'https://www.instagram.com/explore/tags/healthandwellness/' },
        { hashtag: 'FintechInnovation', posts_count: 31000, growth_rate: 10.2, platform: 'linkedin', url: 'https://www.linkedin.com/feed/hashtag/fintechinnovation/' },
        { hashtag: 'CreatorEconomy', posts_count: 28000, growth_rate: 8.5, platform: 'twitter', url: 'https://twitter.com/search?q=%23CreatorEconomy' },
        { hashtag: 'ClimateAction', posts_count: 25000, growth_rate: 6.3, platform: 'instagram', url: 'https://www.instagram.com/explore/tags/climateaction/' },
      ];

      const hashtagsToInsert = demoHashtags.map(h => ({
        user_id: user!.id,
        hashtag: h.hashtag,
        posts_count: h.posts_count,
        growth_rate: h.growth_rate,
        platform: h.platform,
        trending_url: h.url,
        last_updated: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('trending_hashtags')
        .delete()
        .eq('user_id', user!.id);

      if (error) throw error;

      const { error: insertError } = await supabase
        .from('trending_hashtags')
        .insert(hashtagsToInsert);

      if (insertError) throw insertError;

      await loadHashtags();
    } catch (error) {
      console.error('Error generating demo hashtags:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleHashtagClick = (url: string, hashtag: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'twitter':
        return 'bg-blue-100 text-blue-700';
      case 'linkedin':
        return 'bg-blue-200 text-blue-800';
      case 'instagram':
        return 'bg-pink-100 text-pink-700';
      case 'facebook':
        return 'bg-blue-300 text-blue-900';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Trending Hashtags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Trending Hashtags
          </CardTitle>
          <Button
            onClick={generateDemoHashtags}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {hashtags.length === 0 ? (
          <div className="text-center py-8">
            <Flame className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No trending hashtags available</p>
            <Button onClick={generateDemoHashtags} disabled={refreshing}>
              {refreshing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load Demo Data'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {hashtags.map((hashtag, index) => (
              <button
                key={hashtag.id}
                onClick={() => handleHashtagClick(hashtag.trending_url, hashtag.hashtag)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1 text-left">
                  <span className="text-sm font-bold text-gray-400 w-6">
                    #{index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                        #{hashtag.hashtag}
                      </h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPlatformColor(hashtag.platform)}`}>
                        {hashtag.platform}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {hashtag.posts_count.toLocaleString()} posts
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-orange-600 text-xs font-medium">
                    <TrendingUp className="w-3 h-3" />
                    +{hashtag.growth_rate}%
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
