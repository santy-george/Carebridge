export interface GoalLike {
  completed_at: string | null;
}

export interface PlanProgress {
  completed: number;
  total: number;
  percent: number;
}

export function computeProgress(goals: GoalLike[]): PlanProgress {
  const completed = goals.filter((g) => g.completed_at).length;
  const total = goals.length;
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
