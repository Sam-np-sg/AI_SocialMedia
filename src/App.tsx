import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Auth } from './components/Auth';
import { HomePage } from './components/HomePage';
import { OnboardingFlow } from './components/OnboardingFlow';
import { DashboardView } from './components/DashboardView';
import { AICreator } from './components/AICreator';
import { SchedulerView } from './components/SchedulerView';
import { AnalyticsView } from './components/AnalyticsView';
import { SocialAccounts } from './components/SocialAccounts';
import { SettingsView } from './components/SettingsView';
import { OAuthCallback } from './components/OAuthCallback';
import { NotificationBell } from './components/NotificationBell';
import { Button } from './components/ui/button';
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  Calendar,
  BarChart3,
  Share2,
  Settings as SettingsIcon,
  LogOut,
  Loader2
} from 'lucide-react';

type View = 'dashboard' | 'ai-creator' | 'content' | 'scheduler' | 'analytics' | 'social' | 'settings';

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<View>('scheduler');
  const [showAuth, setShowAuth] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [workspaceRefreshTrigger, setWorkspaceRefreshTrigger] = useState(0);

  if (window.location.pathname.startsWith('/auth/callback/')) {
    return <OAuthCallback />;
  }

  useEffect(() => {
    if (user) {
      const hasCompletedOnboarding = localStorage.getItem(`onboarding_completed_${user.id}`);
      if (!hasCompletedOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    if (user) {
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
      setShowOnboarding(false);
    }
  };

  console.log('AppContent render:', { user: user?.email, loading });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    if (showAuth) {
      return <Auth />;
    }
    return <HomePage onGetStarted={() => setShowAuth(true)} />;
  }

  if (showOnboarding) {
    return (
      <OnboardingFlow
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingComplete}
        userId={user?.id}
      />
    );
  }

  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ai-creator' as View, label: 'AI Creator', icon: Sparkles },
    { id: 'scheduler' as View, label: 'Workspace', icon: Calendar },
    { id: 'analytics' as View, label: 'Analytics', icon: BarChart3 },
    { id: 'social' as View, label: 'Social Accounts', icon: Share2 },
    { id: 'settings' as View, label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#1a1625] flex transition-colors duration-500 ease-in-out">
      <aside className="w-64 bg-white dark:bg-[#1f1b2e] border-r border-primary-200 dark:border-[#2a2538] flex flex-col transition-all duration-500 ease-in-out shadow-xl">
        <div className="p-6 border-b border-primary-100 dark:border-[#2a2538] transition-colors duration-500 bg-gradient-to-br from-primary-50 to-pink-50 dark:from-[#1f1b2e] dark:to-[#1f1b2e]">
          <div className="flex items-center gap-3 animate-fadeIn">
            <div className="bg-gradient-to-br from-primary-600 to-pink-500 dark:from-[#7b6cff] dark:to-[#9b8aff] p-2 rounded-lg transition-all duration-300 hover:scale-105">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-pink-600 dark:from-[#9b8aff] dark:to-[#d8a8ff] bg-clip-text text-transparent transition-colors duration-500">Enqor</h1>
              <p className="text-xs text-gray-600 dark:text-[#8a7fa3] transition-colors duration-500">Automation Suite</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-[1.02] group relative ${
                  isActive
                    ? 'bg-[#3a3456] dark:bg-[#2f2b45] text-primary-700 dark:text-[#b8aaff] font-medium border-l-4 border-[#7b6cff]'
                    : 'text-gray-700 dark:text-[#a39bba] hover:bg-primary-50/50 dark:hover:bg-[#28243a] hover:translate-x-1 hover:text-primary-600 dark:hover:text-[#9b8aff]'
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#7b6cff]/5 to-transparent pointer-events-none" />
                )}
                <Icon className={`w-5 h-5 transition-all duration-300 relative z-10 ${isActive ? 'text-primary-600 dark:text-[#b8aaff]' : 'group-hover:text-primary-600 dark:group-hover:text-[#9b8aff]'}`} />
                <span className="transition-all duration-300 relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-[#2a2538] space-y-3">
          <div className="flex justify-start pl-2">
            <NotificationBell />
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start dark:text-[#a39bba] dark:hover:bg-[#28243a] hover:text-primary-600 dark:hover:text-[#b8aaff] transition-all duration-300"
            onClick={() => signOut()}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-[#F9FAFB] dark:bg-[#1a1625]">
        <div className="animate-fadeInUp">
          {currentView === 'dashboard' && <DashboardView />}
          {currentView === 'ai-creator' && <AICreator onNavigateToWorkspace={() => {
            setWorkspaceRefreshTrigger(prev => prev + 1);
            setCurrentView('scheduler');
          }} />}
          {currentView === 'scheduler' && <SchedulerView refreshTrigger={workspaceRefreshTrigger} />}
          {currentView === 'analytics' && <AnalyticsView />}
          {currentView === 'social' && <SocialAccounts />}
          {currentView === 'settings' && <SettingsView />}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
