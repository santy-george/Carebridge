export function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function clampHydrationGoal(goal: number): number {
  return Math.max(0, Math.min(15, goal));
}

export function toggleCupFilled(currentFilled: number, tappedIndex: number): number {
  return currentFilled === tappedIndex + 1 ? tappedIndex : tappedIndex + 1;
}

export interface SelfGoal {
  id: string;
  text: string;
  done_at: string | null;
}

export function isGoalDoneToday(doneAt: string | null, today: Date): boolean {
  if (!doneAt) return false;
  return localDateString(new Date(doneAt)) === localDateString(today);
}
