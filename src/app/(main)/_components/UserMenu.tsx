'use client';

import { useEffect, useState } from 'react';
import { LogOut, User } from 'lucide-react';

type UserData = {
  id: number;
  email: string;
  name: string | null;
} | null;

export default function UserMenu() {
  const [user, setUser] = useState<UserData>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    window.location.href = '/signin';
  };

  if (loading) {
    return (
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-3 border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {user.name || user.email.split('@')[0]}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
