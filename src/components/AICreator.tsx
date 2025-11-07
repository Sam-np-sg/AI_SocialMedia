import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Sparkles, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

interface AICreatorProps {
  onNavigateToWorkspace?: () => void;
}

export function AICreator({ onNavigateToWorkspace }: AICreatorProps) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [contentIdea, setContentIdea] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const platforms = [
    { id: 'twitter', name: 'Twitter', icon: '𝕏' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
    { id: 'instagram', name: 'Instagram', icon: '📷' },
    { id: 'facebook', name: 'Facebook', icon: '📘' },
  ];

  const handleGenerate = async () => {
    setLoading(true);
    setContentIdea('');
    setCaption('');

    try {
      console.log('Sending request to generate AI content...');

      const response = await fetch("https://zhengbin.app.n8n.cloud/webhook/GeminiAI", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          userId: user?.id,
          email: user?.email,
          timestamp: new Date().toISOString(),
        }),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        console.log('Response content-type:', contentType);

        let data;
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const textData = await response.text();
          console.log('Response is plain text:', textData);
          data = textData;
        }

        console.log('Full response data from n8n:', data);
        console.log('Response data type:', typeof data);
        if (typeof data === 'object' && data !== null) {
          console.log('Response data keys:', Object.keys(data || {}));
        }

        // Handle different possible response structures
        let contentIdea = '';
        let caption = '';

        // If response is an array, take the first element (n8n common format)
        if (Array.isArray(data) && data.length > 0) {
          const firstItem = data[0];
          if (typeof firstItem === 'string') {
            contentIdea = `Create engaging visual content about: ${prompt}`;
            caption = firstItem;
          } else if (firstItem.output && typeof firstItem.output === 'string') {
            contentIdea = `Create engaging visual content about: ${prompt}`;
            caption = firstItem.output;
          } else {
            contentIdea = firstItem.contentIdea || firstItem.content_idea || firstItem.idea || `Create engaging visual content about: ${prompt}`;
            caption = firstItem.caption || firstItem.text || firstItem.content || firstItem.message || firstItem.output || '';
          }
        }
        // If response is a string directly, use it as caption
        else if (typeof data === 'string') {
          contentIdea = `Create engaging visual content about: ${prompt}`;
          caption = data;
        }
        // If response has message field (common n8n format)
        else if (data.message) {
          contentIdea = `Create engaging visual content about: ${prompt}`;
          caption = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
        }
        // Check if response has an 'output' field with combined text
        else if (data.output && typeof data.output === 'string') {
          contentIdea = `Create engaging visual content about: ${prompt}`;
          caption = data.output;
        }
        // Check for text field
        else if (data.text) {
          contentIdea = `Create engaging visual content about: ${prompt}`;
          caption = data.text;
        }
        // Check for response field (another common n8n format)
        else if (data.response) {
          contentIdea = `Create engaging visual content about: ${prompt}`;
          caption = typeof data.response === 'string' ? data.response : JSON.stringify(data.response);
        }
        // Check for various possible field names
        else if (data.contentIdea || data.content_idea || data.idea) {
          contentIdea = data.contentIdea || data.content_idea || data.idea;
          caption = data.caption || data.text || data.content || '';
        }
        // If response has nested result structure
        else if (data.result) {
          contentIdea = data.result.contentIdea || data.result.content_idea || data.result.idea || `Create engaging visual content about: ${prompt}`;
          caption = data.result.caption || data.result.text || data.result.content || data.result.message || '';
        }

        if (contentIdea && caption) {
          console.log('Successfully extracted contentIdea and caption');
          setContentIdea(contentIdea);
          setCaption(caption);
        } else {
          console.warn('Response missing expected fields. Using fallback. Data:', data);
          const fallbackIdea = `Create engaging visual content about: ${prompt}`;
          const fallbackCaption = `🚀 ${prompt}\n\nI'm excited to share this with you! This is an AI-generated post that's optimized for engagement across social platforms.\n\n#SocialMedia #AI #Automation`;
          setContentIdea(fallbackIdea);
          setCaption(fallbackCaption);
        }
      } else {
        console.error('Response not OK:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);

        const fallbackIdea = `Create engaging visual content about: ${prompt}`;
        const fallbackCaption = `🚀 ${prompt}\n\nI'm excited to share this with you! This is an AI-generated post that's optimized for engagement across social platforms.\n\n#SocialMedia #AI #Automation`;
        setContentIdea(fallbackIdea);
        setCaption(fallbackCaption);
      }
    } catch (error) {
      console.error('Error calling webhook:', error);
      const fallbackIdea = `Create engaging visual content about: ${prompt}`;
      const fallbackCaption = `🚀 ${prompt}\n\nI'm excited to share this with you! This is an AI-generated post that's optimized for engagement across social platforms.\n\n#SocialMedia #AI #Automation`;
      setContentIdea(fallbackIdea);
      setCaption(fallbackCaption);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!caption || selectedPlatforms.length === 0) {
      alert('Please select at least one platform before saving.');
      return;
    }

    setSaving(true);
    try {
      const taskName = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt;
      const fullContent = `Content Idea: ${contentIdea}\n\nCaption: ${caption}`;

      const postToInsert = {
        user_id: user!.id,
        task_name: taskName,
        content: fullContent,
        platforms: selectedPlatforms,
        status: 'draft',
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      console.log('Saving post to database:', postToInsert);

      const { data, error } = await supabase.from('content_posts').insert([postToInsert]).select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Post saved successfully:', data);

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setContentIdea('');
        setCaption('');
        setPrompt('');
        setSelectedPlatforms([]);
        if (onNavigateToWorkspace) {
          onNavigateToWorkspace();
        }
      }, 1500);
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Failed to save post. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Content Creator</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Generate engaging social media posts with AI</p>
      </div>

      <Card className="mb-6 dark:bg-[#1f1b2e] dark:border-[#2a2538]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-[#9b8aff]" />
            Create Your Post
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="prompt" className="dark:text-gray-200">What would you like to post about?</Label>
            <Textarea
              id="prompt"
              placeholder="E.g., Share tips about productivity, announce a new product, celebrate a milestone..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-2 min-h-[100px] dark:bg-[#28243a] dark:text-white dark:border-[#3a3456] dark:placeholder-gray-500"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!prompt || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {(contentIdea || caption) && (
        <Card className="mb-6 dark:bg-[#1f1b2e] dark:border-[#2a2538]">
          <CardHeader>
            <CardTitle className="dark:text-white">Generated Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="contentIdea" className="dark:text-gray-200 font-semibold">Content Idea</Label>
              <Textarea
                id="contentIdea"
                value={contentIdea}
                onChange={(e) => setContentIdea(e.target.value)}
                placeholder="Idea for what visual or content to create..."
                className="mt-2 min-h-[100px] dark:bg-[#28243a] dark:text-white dark:border-[#3a3456] dark:placeholder-gray-500"
              />
            </div>

            <div>
              <Label htmlFor="caption" className="dark:text-gray-200 font-semibold">Caption</Label>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Caption text to accompany the content..."
                className="mt-2 min-h-[150px] dark:bg-[#28243a] dark:text-white dark:border-[#3a3456] dark:placeholder-gray-500"
              />
            </div>

            <div>
              <Label className="dark:text-gray-200">Select Platforms</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      selectedPlatforms.includes(platform.id)
                        ? 'border-blue-600 bg-blue-50 dark:border-[#7b6cff] dark:bg-[#2f2b45]'
                        : 'border-gray-200 hover:border-gray-300 dark:border-[#3a3456] dark:hover:border-[#4a4556] dark:bg-[#28243a]'
                    }`}
                  >
                    <div className="text-2xl mb-1">{platform.icon}</div>
                    <div className="text-sm font-medium dark:text-gray-200">{platform.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || saved || selectedPlatforms.length === 0}
              className="w-full"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Saved! Redirecting to Workspace...
                </>
              ) : saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving post...
                </>
              ) : (
                <>
                  Save to Workspace
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
