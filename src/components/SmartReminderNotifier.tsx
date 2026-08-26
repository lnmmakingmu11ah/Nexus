import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, Clock, X, Volume2, Sparkles } from 'lucide-react';
import { DailyGoalLog, Goal } from '../types';

interface SmartReminderNotifierProps {
  goals: Goal[];
  dailyLogs: DailyGoalLog[];
  todayStr: string;
  onToggleGoal: (goalId: string) => void;
  showControls?: boolean;
  runScheduler?: boolean;
}

interface ActiveReminderAlert {
  goal: Goal;
  triggerTime: string;
  id: string;
}

export const SmartReminderNotifier: React.FC<SmartReminderNotifierProps> = ({
  goals,
  dailyLogs,
  todayStr,
  onToggleGoal,
  showControls = true,
  runScheduler = true,
}) => {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [activeAlerts, setActiveAlerts] = useState<ActiveReminderAlert[]>([]);
  const [notifiedGoalTimes, setNotifiedGoalTimes] = useState<Set<string>>(new Set());
  const [showPermissionBanner, setShowPermissionBanner] = useState<boolean>(false);

  // Request browser notification permissions
  const requestPermission = async () => {
    if (typeof Notification !== 'undefined') {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === 'granted') {
          new Notification('Smart Reminders Activated!', {
            body: 'You will now receive notifications when your habits are due.',
          });
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    }
  };

  // Check for due reminders every 20 seconds
  useEffect(() => {
    if (!runScheduler) return;

    const checkReminders = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${hours}:${minutes}`;

      // Today's completed goal set
      const completedGoalIdsToday = new Set(
        dailyLogs.filter((l) => l.date === todayStr && l.completed).map((l) => l.goalId)
      );

      const dueGoals = goals.filter((goal) => {
        if (goal.archived) return false;
        if (goal.reminderEnabled === false) return false;
        if (!goal.reminderTime) return false;
        if (completedGoalIdsToday.has(goal.id)) return false;

        // Check if reminderTime matches current HH:MM
        return goal.reminderTime === currentTimeStr;
      });

      dueGoals.forEach((goal) => {
        const reminderKey = `${goal.id}-${todayStr}-${currentTimeStr}`;
        if (!notifiedGoalTimes.has(reminderKey)) {
          setNotifiedGoalTimes((prev) => new Set(prev).add(reminderKey));

          // 1. Browser Native Notification if granted
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              new Notification(`⏰ Habit Due: ${goal.name}`, {
                body: goal.description || `It's ${currentTimeStr}. Ready to conquer this habit?`,
                tag: goal.id,
              });
            } catch (e) {
              console.log('Native notification error:', e);
            }
          }

          // 2. In-App Floating Reminder Toast
          const newAlert: ActiveReminderAlert = {
            goal,
            triggerTime: currentTimeStr,
            id: reminderKey,
          };

          setActiveAlerts((prev) => {
            if (prev.some((a) => a.goal.id === goal.id)) return prev;
            return [...prev, newAlert];
          });
        }
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 20000);
    return () => clearInterval(interval);
  }, [goals, dailyLogs, todayStr, notifiedGoalTimes, runScheduler]);

  const handleDismissAlert = (id: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleCompleteFromAlert = (goalId: string, alertId: string) => {
    onToggleGoal(goalId);
    handleDismissAlert(alertId);
  };

  // Test Trigger
  const handleTriggerTestReminder = () => {
    const uncompletedGoal = goals.find((g) => !g.archived) || goals[0];
    if (!uncompletedGoal) return;

    const testAlert: ActiveReminderAlert = {
      goal: uncompletedGoal,
      triggerTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      id: `test-${Date.now()}`,
    };

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(`⏰ Test Reminder: ${uncompletedGoal.name}`, {
        body: 'Smart Reminder system is functioning smoothly!',
      });
    }

    setActiveAlerts((prev) => [testAlert, ...prev]);
  };

  return (
    <>
      {showControls && (
      <div className="bg-gradient-to-r from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/30 rounded-2xl px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xl shadow-amber-950/20 hover:border-amber-400/50 transition-all duration-300">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-sm">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <span className="text-zinc-200 font-semibold tracking-wide">Smart Habit Reminders:</span>
            <div className="inline-flex items-center ml-2.5">
              {notificationPermission === 'granted' ? (
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              ) : (
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-700/80 px-2.5 py-1 rounded-lg">
                  In-App Only
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {notificationPermission !== 'granted' && typeof Notification !== 'undefined' && (
            <button
              onClick={requestPermission}
              className="text-[11px] font-semibold text-amber-300 hover:text-amber-100 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center space-x-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable Notifications</span>
            </button>
          )}

          <button
            onClick={handleTriggerTestReminder}
            className="text-[11px] font-medium text-zinc-300 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 border border-amber-500/20 hover:border-amber-400/40 px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5"
            title="Test reminder notification toast"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Test Alert</span>
          </button>
        </div>
      </div>
      )}

      {/* Floating Interactive Toast Reminders (Bottom-Right Container) */}
      {activeAlerts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-4 max-w-sm w-full px-4 sm:px-0">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-zinc-950/95 backdrop-blur-2xl border border-amber-400/50 rounded-2xl p-5 text-zinc-100 shadow-2xl shadow-amber-950/60 animate-bounce-short relative space-y-4 ring-1 ring-amber-500/30"
            >
              <div className="flex items-start justify-between space-x-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0 shadow-sm">
                    <Clock className="w-4 h-4 animate-spin-slow" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-amber-400 uppercase font-bold tracking-wider">
                      Habit Due ({alert.triggerTime})
                    </span>
                    <h4 className="text-sm font-bold text-white leading-snug mt-0.5">{alert.goal.name}</h4>
                  </div>
                </div>

                <button
                  onClick={() => handleDismissAlert(alert.id)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {alert.goal.description && (
                <p className="text-xs text-zinc-300 font-light line-clamp-2 bg-zinc-900/80 p-3 rounded-xl border border-amber-500/20 leading-relaxed">
                  {alert.goal.description}
                </p>
              )}

              <div className="flex items-center space-x-2.5 pt-1">
                <button
                  onClick={() => handleCompleteFromAlert(alert.goal.id, alert.id)}
                  className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950/50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Done Now</span>
                </button>
                <button
                  onClick={() => handleDismissAlert(alert.id)}
                  className="py-2 px-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-xl border border-zinc-700/80 transition-colors"
                >
                  Snooze
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
