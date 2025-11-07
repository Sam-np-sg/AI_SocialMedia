import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Calendar,
  Loader2,
  CheckCircle2,
  Upload,
  X,
  Image,
  Video,
  Table,
  LayoutGrid,
  CalendarDays,
  GanttChart,
  Columns,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  Send
} from 'lucide-react';

type ViewType = 'table' | 'card' | 'calendar' | 'gantt' | 'kanban';
type TaskStatus = 'draft' | 'todo' | 'in_progress' | 'completed';

interface Task {
  id: string;
  task_name: string;
  content: string;
  status: TaskStatus;
  scheduled_for: string;
  start_date: string;
  platforms: string[];
  media_urls: string[];
  created_at: string;
  user_id: string;
}

interface SchedulerViewProps {
  refreshTrigger?: number;
}

export function SchedulerView({ refreshTrigger }: SchedulerViewProps = {}) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<ViewType>('card');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [formData, setFormData] = useState({
    task_name: '',
    content: '',
    status: 'draft' as TaskStatus,
    scheduled_for: '',
    start_date: '',
    platforms: [] as string[],
    media_urls: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const platforms = ['twitter', 'linkedin', 'instagram', 'facebook'];

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user, refreshTrigger]);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('content_posts')
        .select('*')
        .eq('user_id', user!.id)
        .in('status', ['draft', 'todo', 'in_progress', 'completed'])
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingMedia(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user!.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('post-media')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setFormData((prev) => ({
        ...prev,
        media_urls: [...prev.media_urls, ...uploadedUrls],
      }));
    } catch (error) {
      console.error('Error uploading media:', error);
      alert('Failed to upload media. Please try again.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const removeMedia = (urlToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      media_urls: prev.media_urls.filter((url) => url !== urlToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const taskData = {
        user_id: user!.id,
        task_name: formData.task_name,
        content: formData.content,
        platforms: formData.platforms,
        status: formData.status,
        scheduled_for: new Date(formData.scheduled_for).toISOString(),
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        media_urls: formData.media_urls,
      };

      if (editingTask) {
        const { error } = await supabase
          .from('content_posts')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('content_posts').insert(taskData);
        if (error) throw error;
      }

      setFormData({
        task_name: '',
        content: '',
        status: 'draft',
        scheduled_for: '',
        start_date: '',
        platforms: [],
        media_urls: [],
      });
      setShowTaskForm(false);
      setEditingTask(null);
      loadTasks();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      task_name: task.task_name || '',
      content: task.content,
      status: task.status,
      scheduled_for: task.scheduled_for ? new Date(task.scheduled_for).toISOString().slice(0, 16) : '',
      start_date: task.start_date ? new Date(task.start_date).toISOString().slice(0, 16) : '',
      platforms: task.platforms || [],
      media_urls: task.media_urls || [],
    });
    setShowTaskForm(true);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('content_posts')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handlePublish = async (task: Task) => {
    if (!task.platforms.includes('twitter')) {
      alert('This task is not set to publish on Twitter. Please add Twitter to the platforms.');
      return;
    }

    if (!confirm('Are you sure you want to publish this post to Twitter now?')) return;

    try {
      const { data: twitterAccount, error: tokenError } = await supabase
        .from('social_accounts')
        .select('access_token, refresh_token, account_handle')
        .eq('user_id', user!.id)
        .eq('platform', 'twitter')
        .eq('is_active', true)
        .maybeSingle();

      if (tokenError) {
        console.error('Error fetching Twitter account:', tokenError);
        throw new Error('Failed to fetch Twitter account details');
      }

      if (!twitterAccount) {
        alert('No active Twitter account found. Please connect your Twitter account first.');
        return;
      }

      if (!twitterAccount.access_token) {
        alert('Twitter access token not found. Please reconnect your Twitter account.');
        return;
      }

      const response = await fetch('https://zhengbin.app.n8n.cloud/webhook-test/twitter-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: task.content,
          userId: user?.id,
          taskId: task.id,
          mediaUrls: task.media_urls || [],
          scheduledFor: task.scheduled_for,
          accessToken: twitterAccount.access_token,
          refreshToken: twitterAccount.refresh_token,
          accountHandle: twitterAccount.account_handle,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to publish: ${response.statusText}`);
      }

      const { error } = await supabase
        .from('content_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;

      alert('Post successfully published to Twitter!');
      loadTasks();
    } catch (error) {
      console.error('Error publishing post:', error);
      alert('Failed to publish post. Please try again.');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const { error } = await supabase
        .from('content_posts')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      loadTasks();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const togglePlatform = (platform: string) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-[#34D399] dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'in_progress':
        return 'bg-yellow-50 text-yellow-700 border-[#FACC15] dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'todo':
        return 'bg-red-50 text-red-700 border-[#F87171] dark:bg-red-900/20 dark:text-red-400';
      case 'draft':
        return 'bg-gray-100 text-gray-700 border-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    const labels = {
      draft: 'Draft',
      todo: 'To Do',
      in_progress: 'In Progress',
      completed: 'Completed',
    };
    return labels[status] || status;
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;

    const dateA = new Date(a.scheduled_for).getTime();
    const dateB = new Date(b.scheduled_for).getTime();
    return dateA - dateB;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const viewOptions = [
    { id: 'table' as ViewType, label: 'Table', icon: Table },
    { id: 'card' as ViewType, label: 'Card', icon: LayoutGrid },
    { id: 'calendar' as ViewType, label: 'Calendar', icon: CalendarDays },
    { id: 'gantt' as ViewType, label: 'Gantt', icon: GanttChart },
    { id: 'kanban' as ViewType, label: 'Kanban', icon: Columns },
  ];

  const currentViewOption = viewOptions.find((v) => v.id === viewType)!;

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Workspace</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Organize and track your content schedule
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowViewDropdown(!showViewDropdown)}
                className="gap-2"
              >
                <currentViewOption.icon className="w-4 h-4" />
                {currentViewOption.label}
                <ChevronDown className="w-4 h-4" />
              </Button>
              {showViewDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1f1b2e] border border-gray-200 dark:border-[#2a2538] rounded-lg z-10">
                  {viewOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          setViewType(option.id);
                          setShowViewDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          viewType === option.id
                            ? 'bg-blue-50 dark:bg-[#2f2b45] text-blue-700 dark:text-[#b8aaff]'
                            : 'text-gray-700 dark:text-[#a39bba] hover:bg-gray-50 dark:hover:bg-[#28243a]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <Button onClick={() => {
              setEditingTask(null);
              setFormData({
                task_name: '',
                content: '',
                status: 'draft',
                scheduled_for: '',
                start_date: '',
                platforms: [],
                media_urls: [],
              });
              setShowTaskForm(!showTaskForm);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>
      </div>

      {showTaskForm && (
        <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="task_name" className="dark:text-gray-200">
                    Task Name
                  </Label>
                  <Input
                    id="task_name"
                    value={formData.task_name}
                    onChange={(e) =>
                      setFormData({ ...formData, task_name: e.target.value })
                    }
                    placeholder="Enter task name"
                    className="mt-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="status" className="dark:text-gray-200">
                    Status
                  </Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as TaskStatus })
                    }
                    className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="draft">Draft</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="content" className="dark:text-gray-200">
                  Post Content
                </Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Write your social media post content here..."
                  className="mt-2 min-h-[120px] dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This is the actual content that will be posted to your social media accounts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date" className="dark:text-gray-200">
                    Start Date
                  </Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="mt-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  />
                </div>

                <div>
                  <Label htmlFor="scheduled_for" className="dark:text-gray-200">
                    Due Date (Deadline)
                  </Label>
                  <Input
                    id="scheduled_for"
                    type="datetime-local"
                    value={formData.scheduled_for}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduled_for: e.target.value })
                    }
                    className="mt-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="dark:text-gray-200">Media (Images/Videos)</Label>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      id="media-upload"
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleMediaUpload}
                      className="hidden"
                      disabled={uploadingMedia}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('media-upload')?.click()}
                      disabled={uploadingMedia}
                      className="w-full"
                    >
                      {uploadingMedia ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Images/Videos
                        </>
                      )}
                    </Button>
                  </div>

                  {formData.media_urls.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {formData.media_urls.map((url, index) => {
                        const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
                        return (
                          <div key={index} className="relative group">
                            {isVideo ? (
                              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                                <Video className="w-8 h-8 text-gray-400" />
                              </div>
                            ) : (
                              <img
                                src={url}
                                alt={`Upload ${index + 1}`}
                                className="w-full aspect-video object-cover rounded-lg"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => removeMedia(url)}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label className="dark:text-gray-200">Select Platforms</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  {platforms.map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => togglePlatform(platform)}
                      className={`p-3 border-2 rounded-lg capitalize transition-all ${
                        formData.platforms.includes(platform)
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-white'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {editingTask ? 'Update Task' : 'Create Task'}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowTaskForm(false);
                    setEditingTask(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="animate-scaleIn">
        {viewType === 'table' && (
          <TableView
            tasks={sortedTasks}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPublish={handlePublish}
            onStatusChange={handleStatusChange}
            getStatusColor={getStatusColor}
            getStatusBadge={getStatusBadge}
          />
        )}

        {viewType === 'card' && (
          <CardView
            tasks={sortedTasks}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPublish={handlePublish}
            onStatusChange={handleStatusChange}
            getStatusColor={getStatusColor}
            getStatusBadge={getStatusBadge}
          />
        )}

        {viewType === 'calendar' && (
          <CalendarTaskView
            tasks={tasks}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onEdit={handleEdit}
            getStatusColor={getStatusColor}
            getStatusBadge={getStatusBadge}
          />
        )}

        {viewType === 'gantt' && (
          <GanttView
            tasks={sortedTasks}
            getStatusColor={getStatusColor}
            getStatusBadge={getStatusBadge}
          />
        )}
      </div>

      <div className="animate-scaleIn">
        {viewType === 'kanban' && (
          <KanbanView
            tasks={tasks}
            onStatusChange={handleStatusChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
            getStatusColor={getStatusColor}
          />
        )}
      </div>
    </div>
  );
}

function TableView({ tasks, onEdit, onDelete, onPublish, onStatusChange, getStatusColor, getStatusBadge }: any) {
  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">Task Name</th>
                <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">Start Date</th>
                <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">Due Date</th>
                <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">Platforms</th>
                <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No tasks yet. Create your first task to get started.
                  </td>
                </tr>
              ) : (
                tasks.map((task: Task) => (
                  <tr key={task.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="p-4">
                      <div className="font-medium text-gray-900 dark:text-white">{task.task_name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{task.content}</div>
                    </td>
                    <td className="p-4">
                      <select
                        value={task.status}
                        onChange={(e) => onStatusChange(task.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(task.status)}`}
                      >
                        <option value="draft">Draft</option>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                      {task.start_date
                        ? new Date(task.start_date).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(task.scheduled_for).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {task.platforms.map((platform: string) => (
                          <span
                            key={platform}
                            className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded capitalize"
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {task.platforms.includes('twitter') && task.status !== 'published' && (
                          <Button
                            size="sm"
                            onClick={() => onPublish(task)}
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(task)}
                          className="dark:text-gray-300"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(task.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function CardView({ tasks, onEdit, onDelete, onPublish, onStatusChange, getStatusColor, getStatusBadge }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasks.length === 0 ? (
        <Card className="col-span-full dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No tasks yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Create your first task to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        tasks.map((task: Task) => (
          <Card key={task.id} className="dark:bg-[#1f1b2e] dark:border-[#2a2538] transition-all">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2 dark:text-[#b8aaff]">{task.task_name}</CardTitle>
                  <select
                    value={task.status}
                    onChange={(e) => onStatusChange(task.id, e.target.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}
                  >
                    <option value="draft">Draft</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(task)}
                    className="dark:text-[#a39bba]"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(task.id)}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                {task.content}
              </p>

              <div className="space-y-2 text-sm">
                {task.start_date && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>Start: {new Date(task.start_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Due: {new Date(task.scheduled_for).toLocaleDateString()}</span>
                </div>
              </div>

              {task.platforms.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3 mb-3">
                  {task.platforms.map((platform: string) => (
                    <span
                      key={platform}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded capitalize"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              )}

              {task.platforms.includes('twitter') && task.status !== 'published' && (
                <Button
                  onClick={() => onPublish(task)}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Post to Twitter
                </Button>
              )}

              {task.status === 'published' && (
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Published
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function CalendarTaskView({ tasks, currentDate, setCurrentDate, selectedDate, setSelectedDate, onEdit, getStatusColor, getStatusBadge }: any) {
  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const daysInPrevMonth = prevLastDay.getDate();

    const days = [];

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({ date, isCurrentMonth: false, tasks: getTasksForDate(date) });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true, tasks: getTasksForDate(date) });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false, tasks: getTasksForDate(date) });
    }

    return days;
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task: Task) => {
      const taskDate = new Date(task.scheduled_for);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const calendarDays = generateCalendar();
  const selectedDayTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  className="dark:border-gray-600 dark:text-gray-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  className="dark:border-gray-600 dark:text-gray-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2">
                  {day}
                </div>
              ))}

              {calendarDays.map((day: any, index: number) => {
                const isSelected = selectedDate &&
                  day.date.getDate() === selectedDate.getDate() &&
                  day.date.getMonth() === selectedDate.getMonth() &&
                  day.date.getFullYear() === selectedDate.getFullYear();

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(day.date)}
                    className={`
                      relative min-h-[80px] p-2 rounded-lg border-2 transition-all
                      ${!day.isCurrentMonth
                        ? 'bg-gray-50 dark:bg-[#0f0d18] text-gray-400 dark:text-[#4a4556] border-transparent'
                        : 'bg-white dark:bg-[#1f1b2e] text-gray-900 dark:text-[#b8aaff] border-gray-200 dark:border-[#2a2538] hover:border-blue-300 dark:hover:border-[#3a3456]'
                      }
                      ${isSelected ? 'border-blue-600 dark:border-[#7b6cff] bg-blue-50 dark:bg-[#2f2b45]' : ''}
                      ${isToday(day.date) && day.isCurrentMonth ? 'ring-2 ring-blue-600 dark:ring-[#7b6cff]' : ''}
                    `}
                  >
                    <div className="text-left">
                      <span className={`text-sm font-semibold ${isToday(day.date) ? 'text-blue-600 dark:text-[#9b8aff]' : ''}`}>
                        {day.date.getDate()}
                      </span>
                    </div>

                    {day.tasks.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {day.tasks.slice(0, 2).map((task: Task, idx: number) => (
                          <div
                            key={idx}
                            className={`text-xs px-1.5 py-0.5 rounded truncate ${
                              task.status === 'completed' ? 'bg-green-600' :
                              task.status === 'in_progress' ? 'bg-yellow-600' :
                              task.status === 'todo' ? 'bg-red-600' : 'bg-gray-600'
                            } text-white`}
                            title={task.task_name}
                          >
                            {task.task_name}
                          </div>
                        ))}
                        {day.tasks.length > 2 && (
                          <div className="text-xs px-1.5 py-0.5 bg-gray-500 text-white rounded">
                            +{day.tasks.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="dark:bg-gray-800 dark:border-gray-700 sticky top-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {selectedDate
                ? selectedDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Select a date'}
            </h3>

            {selectedDate && selectedDayTasks.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  No tasks for this day
                </p>
              </div>
            )}

            {selectedDate && selectedDayTasks.length > 0 && (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {selectedDayTasks.map((task: Task) => (
                  <div
                    key={task.id}
                    onClick={() => onEdit(task)}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">{task.task_name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {getStatusBadge(task.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
                      {task.content}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {task.platforms.map((platform: string) => (
                        <span
                          key={platform}
                          className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded capitalize"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!selectedDate && (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Click on a date to view tasks
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GanttView({ tasks, getStatusColor, getStatusBadge }: any) {
  const sortedByDate = [...tasks].sort((a, b) => {
    const dateA = new Date(a.start_date || a.scheduled_for).getTime();
    const dateB = new Date(b.start_date || b.scheduled_for).getTime();
    return dateA - dateB;
  });

  const getEarliestDate = () => {
    if (tasks.length === 0) return new Date();
    const dates = tasks.map((t: Task) => new Date(t.start_date || t.scheduled_for));
    return new Date(Math.min(...dates.map((d: Date) => d.getTime())));
  };

  const getLatestDate = () => {
    if (tasks.length === 0) return new Date();
    const dates = tasks.map((t: Task) => new Date(t.scheduled_for));
    return new Date(Math.max(...dates.map((d: Date) => d.getTime())));
  };

  const earliestDate = getEarliestDate();
  const latestDate = getLatestDate();
  const totalDays = Math.ceil((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const getTaskPosition = (task: Task) => {
    const startDate = new Date(task.start_date || task.scheduled_for);
    const endDate = new Date(task.scheduled_for);
    const start = Math.ceil((startDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return {
      left: `${(start / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardContent className="p-6">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <GanttChart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No tasks yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Create tasks to see them in the Gantt chart
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {earliestDate.toLocaleDateString()} - {latestDate.toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {totalDays} days
              </div>
            </div>

            <div className="space-y-3">
              {sortedByDate.map((task: Task) => {
                const position = getTaskPosition(task);
                return (
                  <div key={task.id} className="relative">
                    <div className="flex items-center gap-4 mb-1">
                      <div className="w-48 flex-shrink-0">
                        <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {task.task_name}
                        </div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusBadge(task.status)}
                        </span>
                      </div>
                      <div className="flex-1 relative h-8 bg-gray-100 dark:bg-gray-700 rounded">
                        <div
                          className={`absolute h-full rounded transition-all ${
                            task.status === 'completed' ? 'bg-green-500' :
                            task.status === 'in_progress' ? 'bg-yellow-500' :
                            task.status === 'todo' ? 'bg-red-500' : 'bg-gray-500'
                          }`}
                          style={position}
                        >
                          <div className="flex items-center justify-center h-full px-2">
                            <span className="text-xs text-white font-medium truncate">
                              {new Date(task.start_date || task.scheduled_for).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {' - '}
                              {new Date(task.scheduled_for).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KanbanView({ tasks, onStatusChange, onEdit, onDelete, getStatusColor }: any) {
  const columns: { status: TaskStatus; title: string; color: string }[] = [
    { status: 'draft', title: 'Draft', color: 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600' },
    { status: 'todo', title: 'To Do', color: 'bg-red-50 dark:bg-red-900/20 border-[#F87171] dark:border-red-700' },
    { status: 'in_progress', title: 'In Progress', color: 'bg-yellow-50 dark:bg-yellow-900/20 border-[#FACC15] dark:border-yellow-700' },
    { status: 'completed', title: 'Completed', color: 'bg-emerald-50 dark:bg-emerald-900/20 border-[#34D399] dark:border-emerald-700' },
  ];

  const getTasksForColumn = (status: TaskStatus) => {
    return tasks.filter((task: Task) => task.status === status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map((column) => {
        const columnTasks = getTasksForColumn(column.status);
        return (
          <Card key={column.status} className={`${column.color} border-2`}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="dark:text-white">{column.title}</span>
                <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                  {columnTasks.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {columnTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  No tasks
                </div>
              ) : (
                columnTasks.map((task: Task) => (
                  <Card key={task.id} className="bg-white dark:bg-[#1f1b2e] border-gray-200 dark:border-[#2a2538] transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-[#b8aaff]">{task.task_name}</h4>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit(task)}
                            className="h-6 w-6 p-0 dark:text-[#a39bba]"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDelete(task.id)}
                            className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-[#a39bba] mb-3 line-clamp-2">
                        {task.content}
                      </p>
                      <div className="text-xs text-gray-600 dark:text-[#8a7fa3] mb-2">
                        Due: {new Date(task.scheduled_for).toLocaleDateString()}
                      </div>
                      {task.platforms.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {task.platforms.map((platform: string) => (
                            <span
                              key={platform}
                              className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded capitalize"
                            >
                              {platform}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex gap-1">
                          {column.status !== 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onStatusChange(task.id, column.status === 'completed' ? 'in_progress' : column.status === 'in_progress' ? 'todo' : 'draft')}
                              className="flex-1 text-xs h-7"
                            >
                              ← Move Left
                            </Button>
                          )}
                          {column.status !== 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onStatusChange(task.id, column.status === 'draft' ? 'todo' : column.status === 'todo' ? 'in_progress' : 'completed')}
                              className="flex-1 text-xs h-7"
                            >
                              Move Right →
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
