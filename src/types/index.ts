export interface Subtask {
    id: string;
    text: string;
    completed: boolean;
}

export interface RecurrenceRule {
    freq: "daily" | "weekly" | "monthly";
    interval: number;
    weekDays?: number[]; // 0=Sun
    monthDays?: number[]; // 1-31
}

export interface Task {
    id: string;
    text: string;
    completed: boolean;
    createdAt: number;
    completedAt?: number;
    dueDate?: number;
    includeTime?: boolean;
    notificationOffset?: number;
    priority?: "high" | "medium" | "low";
    tags?: string[];
    subtasks?: Subtask[];
    notes?: string;
    recurrenceRule?: RecurrenceRule;
    attachments?: string[];
}
