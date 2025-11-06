import { Bell } from 'lucide-react';
import { Button } from './ui/button';

export function NotificationBell() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative hover:bg-primary-50 dark:hover:bg-gray-700"
    >
      <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
    </Button>
  );
}
