export interface Habit {
  id: string;
  title: string;
  description: string | null;
  dueTime: string; // "HH:mm"
  createdAt: Date;
}

export interface HabitLog {
  habitId: string;
  logDate: string; // "yyyy-MM-dd"
  completed: boolean;
  completedAt: Date | null;
}
