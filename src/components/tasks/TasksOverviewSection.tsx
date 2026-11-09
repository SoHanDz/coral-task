"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { Reorder } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { endOfDay, startOfDay } from "date-fns";
import { createTask, deleteTask, rescheduleTaskToToday, updateTask, updateTaskStatus } from "@/app/actions/tasks";
import {
  createRecurringTask,
  deleteRecurringTask,
  setOccurrenceStatus,
  updateRecurringTask,
} from "@/app/actions/recurring-tasks";
import { saveTaskDayOrder } from "@/app/actions/task-orders";
import { createHabit, deleteHabit, setHabitLogStatus, updateHabit } from "@/app/actions/habits";
import { Button } from "@/components/ui/button";
import { TaskDayItem } from "@/components/tasks/TaskDayItem";
import { TaskFormDialog, type HabitFormInput, type TaskFormInput } from "@/components/tasks/TaskFormDialog";
import { HabitChecklistItem } from "@/components/habits/HabitChecklistItem";
import { HabitDetailDialog } from "@/components/habits/HabitDetailDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toDateKey } from "@/lib/date/date-key";
import { sortHabitsByStreak } from "@/lib/habits/stats";
import type { Habit, HabitLog } from "@/lib/habits/types";
import {
  getVisibleOccurrences,
  isOccurrenceId,
  templateIdOf,
  type OccurrenceCompletions,
  type RecurringTask,
} from "@/lib/tasks/recurrence";
import { orderDayTasks, type TaskDayOrders } from "@/lib/tasks/order";
import type { Task, TaskRecurrence, TaskStatus } from "@/lib/tasks/types";

interface TasksOverviewSectionProps {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  recurringTasks: RecurringTask[];
  occurrenceCompletions: OccurrenceCompletions;
  selectedDate: Date;
  taskDayOrders: TaskDayOrders;
}

type RecurringAction =
  | { type: "create"; template: RecurringTask }
  | { type: "edit"; id: string; title: string; description: string | null; recurrence?: TaskRecurrence }
  | { type: "delete"; id: string };

function applyRecurringAction(state: RecurringTask[], action: RecurringAction): RecurringTask[] {
  switch (action.type) {
    case "create":
      return [...state, action.template];
    case "edit":
      return state.map((t) =>
        t.id === action.id
          ? { ...t, title: action.title, description: action.description, recurrence: action.recurrence ?? t.recurrence }
          : t
      );
    case "delete":
      return state.filter((t) => t.id !== action.id);
  }
}

type CompletionAction = { key: string; completed: boolean } | { deleteTemplateId: string };

function applyCompletionAction(state: OccurrenceCompletions, action: CompletionAction): OccurrenceCompletions {
  if ("deleteTemplateId" in action) {
    return Object.fromEntries(Object.entries(state).filter(([key]) => templateIdOf(key) !== action.deleteTemplateId));
  }
  if (!action.completed) return Object.fromEntries(Object.entries(state).filter(([key]) => key !== action.key));
  return { ...state, [action.key]: new Date() };
}

type OptimisticAction =
  | { type: "create"; task: Task }
  | { type: "edit"; id: string; input: TaskFormInput }
  | { type: "setStatus"; id: string; status: TaskStatus }
  | { type: "reschedule"; id: string }
  | { type: "delete"; id: string };

function applyOptimisticAction(state: Task[], action: OptimisticAction): Task[] {
  switch (action.type) {
    case "create":
      return [action.task, ...state];
    case "edit":
      return state.map((task) =>
        task.id === action.id
          ? {
              ...task,
              title: action.input.title,
              description: action.input.description,
              startDate: action.input.startDate,
              endDate: action.input.endDate,
              subtasks: action.input.subtasks,
            }
          : task
      );
    case "setStatus":
      return state.map((task) =>
        task.id === action.id
          ? { ...task, status: action.status, completedAt: action.status === "completed" ? new Date() : null }
          : task
      );
    case "reschedule": {
      const now = new Date();
      return state.map((task) =>
        task.id === action.id ? { ...task, startDate: startOfDay(now), endDate: endOfDay(now) } : task
      );
    }
    case "delete":
      return state.filter((task) => task.id !== action.id);
  }
}

type HabitLogAction = { habitId: string; logDate: string; completed: boolean };

function applyOptimisticHabitLog(state: HabitLog[], action: HabitLogAction): HabitLog[] {
  const next: HabitLog = {
    habitId: action.habitId,
    logDate: action.logDate,
    completed: action.completed,
    completedAt: action.completed ? new Date() : null,
  };
  const idx = state.findIndex((log) => log.habitId === action.habitId && log.logDate === action.logDate);
  if (idx === -1) return [...state, next];
  return state.map((log, i) => (i === idx ? next : log));
}

/** True when the task's [startDate, endDate] window includes this calendar day. */
function isTaskOnDay(task: Task, dayKey: string): boolean {
  return toDateKey(task.startDate) <= dayKey && dayKey <= toDateKey(task.endDate);
}

export function TasksOverviewSection({
  tasks,
  habits,
  habitLogs,
  recurringTasks: serverRecurringTasks,
  occurrenceCompletions: serverCompletions,
  selectedDate,
  taskDayOrders,
}: TasksOverviewSectionProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Local state updates immediately on every action; it reconciles with the
  // server-fetched props once router.refresh() lands, so interactions never
  // wait on the Supabase round trip to feel instant.
  const [optimisticTasks, applyOptimistic] = useOptimistic(tasks, applyOptimisticAction);
  const [optimisticHabitLogs, applyOptimisticLog] = useOptimistic(habitLogs, applyOptimisticHabitLog);
  // Tracks which specific task/habit row is mid-mutation, so the loading
  // state renders inline in that row's own checkbox instead of a generic
  // banner — the mutation itself still runs immediately regardless.
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [pendingHabitIds, setPendingHabitIds] = useState<Set<string>>(new Set());
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [recurringTasks, applyRecurring] = useOptimistic(serverRecurringTasks, applyRecurringAction);
  const [occurrenceCompletions, applyCompletion] = useOptimistic(serverCompletions, applyCompletionAction);
  // Drag order is local-first: it is the source of truth after mount and is
  // saved in the background, so a drop never waits on the network.
  const [localOrders, setLocalOrders] = useState(taskDayOrders);
  // Pending ids in live drag order, only while a drag is in progress.
  const [dragIds, setDragIds] = useState<string[] | null>(null);
  const dragIdsRef = useRef<string[] | null>(null);

  function withTaskPending(id: string, fn: () => Promise<void>) {
    setPendingTaskIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      try {
        await fn();
      } finally {
        setPendingTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  }

  function withHabitPending(id: string, fn: () => Promise<void>) {
    setPendingHabitIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      try {
        await fn();
      } finally {
        setPendingHabitIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  }

  function handleCreate(input: TaskFormInput) {
    if (input.recurrence) {
      const template: RecurringTask = {
        id: crypto.randomUUID(),
        title: input.title,
        description: input.description,
        recurrence: input.recurrence,
        createdAt: new Date(),
      };
      startTransition(async () => {
        applyRecurring({ type: "create", template });
        await createRecurringTask({
          id: template.id,
          title: template.title,
          description: template.description,
          recurrence: template.recurrence,
        });
        router.refresh();
      });
      return;
    }

    const optimisticTask: Task = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "pending",
      createdAt: new Date(),
      completedAt: null,
      subtasks: input.subtasks,
    };
    startTransition(async () => {
      applyOptimistic({ type: "create", task: optimisticTask });
      await createTask(input);
      router.refresh();
    });
  }

  function handleCreateHabit(input: HabitFormInput) {
    startTransition(async () => {
      await createHabit(input);
      router.refresh();
    });
  }

  function handleEdit(id: string, input: TaskFormInput) {
    // Editing any occurrence edits the shared weekly/monthly definition.
    if (isOccurrenceId(id)) {
      const templateId = templateIdOf(id);
      const recurrence = input.recurrence ?? recurringTasks.find((t) => t.id === templateId)?.recurrence;
      if (!recurrence) return;
      startTransition(async () => {
        applyRecurring({
          type: "edit",
          id: templateId,
          title: input.title,
          description: input.description,
          recurrence,
        });
        await updateRecurringTask(templateId, { title: input.title, description: input.description, recurrence });
        router.refresh();
      });
      return;
    }

    startTransition(async () => {
      applyOptimistic({ type: "edit", id, input });
      await updateTask(id, input);
      router.refresh();
    });
  }

  function handleToggleStatus(id: string) {
    // An occurrence is only ever flagged done/undone under its own
    // `template::date` key - nothing is created, so an overdue one can't duplicate.
    if (isOccurrenceId(id)) {
      const completed = !occurrenceCompletions[id];
      const [templateId, date] = id.split("::");
      withTaskPending(id, async () => {
        applyCompletion({ key: id, completed });
        await setOccurrenceStatus(templateId, date, completed);
        router.refresh();
      });
      return;
    }

    const task = optimisticTasks.find((t) => t.id === id);
    if (!task) return;
    const nextStatus = task.status === "pending" ? "completed" : "pending";
    withTaskPending(id, async () => {
      applyOptimistic({ type: "setStatus", id, status: nextStatus });
      await updateTaskStatus(id, nextStatus);
      router.refresh();
    });
  }

  // Wired to the task-edit dialog's subtask checklist: finishing the last
  // subtask (or unchecking one) flips the parent task's own status.
  function handleStatusChange(id: string, status: TaskStatus) {
    withTaskPending(id, async () => {
      applyOptimistic({ type: "setStatus", id, status });
      await updateTaskStatus(id, status);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (isOccurrenceId(id)) {
      const templateId = templateIdOf(id);
      startTransition(async () => {
        applyRecurring({ type: "delete", id: templateId });
        applyCompletion({ deleteTemplateId: templateId });
        await deleteRecurringTask(templateId);
        router.refresh();
      });
      return;
    }

    startTransition(async () => {
      applyOptimistic({ type: "delete", id });
      await deleteTask(id);
      router.refresh();
    });
  }

  function handleRescheduleToToday(id: string) {
    withTaskPending(id, async () => {
      applyOptimistic({ type: "reschedule", id });
      await rescheduleTaskToToday(id);
      router.refresh();
    });
  }

  function handleToggleHabitLog(habitId: string, completed: boolean) {
    const logDate = toDateKey(selectedDate);
    withHabitPending(habitId, async () => {
      applyOptimisticLog({ habitId, logDate, completed });
      await setHabitLogStatus(habitId, logDate, completed);
      router.refresh();
    });
  }

  function handleUpdateHabit(id: string, input: { title: string; description: string | null; dueTime: string }) {
    startTransition(async () => {
      await updateHabit(id, input);
      router.refresh();
    });
  }

  function handleDeleteHabit(id: string) {
    startTransition(async () => {
      await deleteHabit(id);
      router.refresh();
    });
  }

  const todayKey = toDateKey(new Date());
  const selectedKey = toDateKey(selectedDate);
  const isTodaySelected = selectedKey === todayKey;

  // "Hôm nay" rolls every unfinished past-due task forward so nothing gets
  // silently skipped: status='pending' AND its whole window already ended.
  // Weekly/monthly occurrences follow the same rule (see getVisibleOccurrences).
  const oneTimeTasks = optimisticTasks.filter((task) =>
    isTodaySelected
      ? isTaskOnDay(task, todayKey) || (task.status === "pending" && toDateKey(task.endDate) < todayKey)
      : isTaskOnDay(task, selectedKey)
  );
  const dayTasks = [...oneTimeTasks, ...getVisibleOccurrences(recurringTasks, occurrenceCompletions, selectedDate)];

  // Pending first in the user's dragged order (undragged ones by nearest
  // deadline); finished tasks sink to the bottom.
  const orderedDayTasks = orderDayTasks(dayTasks, localOrders[selectedKey]);
  const pendingDayTasks = orderedDayTasks.filter((task) => task.status === "pending");
  const completedDayTasks = orderedDayTasks.filter((task) => task.status === "completed");
  const pendingById = new Map(pendingDayTasks.map((task) => [task.id, task]));
  const visiblePendingTasks = dragIds ? dragIds.flatMap((id) => pendingById.get(id) ?? []) : pendingDayTasks;

  function handleReorder(ids: string[]) {
    dragIdsRef.current = ids;
    setDragIds(ids);
  }

  function handleSortEnd() {
    const ids = dragIdsRef.current;
    dragIdsRef.current = null;
    setDragIds(null);
    if (!ids) return;

    const day = selectedKey;
    const previous = localOrders[day];
    // Completed ids are kept too, so un-ticking a task restores its place.
    const next = [...ids, ...completedDayTasks.map((task) => task.id)];
    if (previous && previous.join() === next.join()) return;

    setLocalOrders((prev) => ({ ...prev, [day]: next }));
    startTransition(async () => {
      try {
        await saveTaskDayOrder(day, next);
      } catch {
        setLocalOrders((prev) => {
          const rest = { ...prev };
          delete rest[day];
          return previous ? { ...rest, [day]: previous } : rest;
        });
      }
    });
  }

  function renderTask(task: Task, sortable: boolean) {
    return (
      <TaskDayItem
        key={task.id}
        task={task}
        onToggleStatus={handleToggleStatus}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRescheduleToToday={handleRescheduleToToday}
        onStatusChange={handleStatusChange}
        pending={pendingTaskIds.has(task.id)}
        sortable={sortable}
        onSortEnd={handleSortEnd}
      />
    );
  }

  const habitLogsByHabitId = new Map(
    optimisticHabitLogs.filter((log) => log.logDate === selectedKey).map((log) => [log.habitId, log])
  );
  const selectedHabit = habits.find((h) => h.id === selectedHabitId) ?? null;
  const sortedHabits = sortHabitsByStreak(habits, optimisticHabitLogs, new Date());

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
        <CardHeader className="flex flex-row items-center justify-between px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-lg font-semibold text-slate-700">Công việc cần làm</CardTitle>
          <TaskFormDialog
            trigger={<Button type="button">+ Thêm công việc</Button>}
            defaultDate={selectedDate}
            onSubmitTask={handleCreate}
            onSubmitHabit={handleCreateHabit}
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-6 px-4 pb-6 sm:px-8 sm:pb-8">
          {orderedDayTasks.length === 0 ? (
            <p className="text-sm text-slate-500">Không có việc nào vào ngày này.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <Reorder.Group
                as="ul"
                axis="y"
                values={visiblePendingTasks.map((task) => task.id)}
                onReorder={handleReorder}
                className="flex flex-col gap-2"
              >
                {visiblePendingTasks.map((task) => renderTask(task, true))}
              </Reorder.Group>
              {completedDayTasks.length > 0 && (
                <ul className="flex flex-col gap-2">{completedDayTasks.map((task) => renderTask(task, false))}</ul>
              )}
            </div>
          )}

          <section className="flex flex-col gap-3 border-t border-slate-200/80 pt-5" aria-label="Thói quen hàng ngày">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-600">Thói quen hàng ngày</h3>
              <Link
                href="/habits"
                className="flex items-center gap-1 text-xs font-medium text-primary transition-colors duration-200 hover:underline"
              >
                Xem chi tiết
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            {habits.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có thói quen nào.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sortedHabits.map((habit) => (
                  <HabitChecklistItem
                    key={habit.id}
                    habit={habit}
                    log={habitLogsByHabitId.get(habit.id)}
                    onToggle={handleToggleHabitLog}
                    pending={pendingHabitIds.has(habit.id)}
                    onRowClick={(h) => setSelectedHabitId(h.id)}
                  />
                ))}
              </ul>
            )}
          </section>
        </CardContent>
      </Card>

      <HabitDetailDialog
        habit={selectedHabit}
        habitLogs={optimisticHabitLogs}
        open={selectedHabitId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedHabitId(null);
        }}
        onUpdate={handleUpdateHabit}
        onDelete={handleDeleteHabit}
      />
    </div>
  );
}
