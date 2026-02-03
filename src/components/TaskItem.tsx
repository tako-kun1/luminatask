import { Trash2, Check, Calendar, Flag, Tag } from "lucide-react";
import { format } from "date-fns";
import { Task, Theme } from "../types";
import { cn } from "../utils";
import { useTranslation } from "react-i18next";
import { useRef, useEffect } from "react";

interface TaskItemProps {
    task: Task;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent, task: Task) => void;
    theme: Theme;
    isFocused?: boolean;
}

export function TaskItem({ task, onToggle, onDelete, onClick, onContextMenu, theme, isFocused }: TaskItemProps) {
    const { t } = useTranslation();
    const itemRef = useRef<HTMLDivElement>(null);

    // Scroll into view if focused
    useEffect(() => {
        if (isFocused && itemRef.current) {
            itemRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [isFocused]);

    const priorityColors = {
        high: "border-l-4 border-l-red-500",
        medium: "border-l-4 border-l-yellow-500",
        low: "border-l-4 border-l-blue-500",
    };

    const isOverdue = task.dueDate && task.dueDate < Date.now() && !task.completed;

    return (
        <div
            ref={itemRef}
            onClick={onClick}
            onContextMenu={(e) => onContextMenu && onContextMenu(e, task)}
            className={cn(
                "group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 border select-none",
                theme === "dark"
                    ? "bg-white/10 border border-white/20 hover:bg-white/20"
                    : "bg-white border border-gray-100 hover:bg-gray-50 shadow-gray-200/50",
                task.priority && priorityColors[task.priority]
            )}
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle(task.id);
                    }}
                    className={cn(
                        "w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors",
                        task.completed
                            ? "bg-green-500 border-green-500"
                            : theme === "dark"
                                ? "border-white/50 hover:border-white"
                                : "border-gray-300 hover:border-gray-500"
                    )}
                >
                    {task.completed && <Check size={14} className="text-white" />}
                </button>
                <div className="flex flex-col min-w-0">
                    <span
                        className={cn(
                            "text-lg font-medium transition-all truncate",
                            task.completed
                                ? theme === "dark" ? "line-through text-white/50" : "line-through text-gray-400"
                                : theme === "dark" ? "text-white" : "text-gray-800"
                        )}
                    >
                        {task.text}
                    </span>

                    {/* Metadata Row */}
                    <div className={cn(
                        "flex flex-wrap items-center gap-3 text-xs mt-1",
                        theme === "dark" ? "text-white/40" : "text-gray-400"
                    )}>
                        {/* Created At */}
                        <span>
                            {format(task.createdAt, "MM/dd HH:mm")}
                        </span>

                        {/* Completed At */}
                        {task.completed && task.completedAt && (
                            <span className="text-green-500/80">
                                {t("task.actions.complete")}: {format(task.completedAt, "MM/dd HH:mm")}
                            </span>
                        )}

                        {/* Due Date */}
                        {task.dueDate && (
                            <span className={cn(
                                "flex items-center gap-1",
                                isOverdue ? "text-red-400 font-bold" : ""
                            )}>
                                <Calendar size={12} />
                                {format(task.dueDate, "MM/dd HH:mm")}
                            </span>
                        )}

                        {/* Priority Badge */}
                        {task.priority && (
                            <span className={cn(
                                "flex items-center gap-1 px-1.5 py-0.5 rounded uppercase text-[10px] font-bold tracking-wider",
                                task.priority === "high" ? "bg-red-500/20 text-red-500" :
                                    task.priority === "medium" ? "bg-yellow-500/20 text-yellow-500" :
                                        "bg-blue-500/20 text-blue-500"
                            )}>
                                <Flag size={10} /> {t(`task.priority.${task.priority}`)}
                            </span>
                        )}

                        {/* Tags */}
                        {task.tags && task.tags.map(tag => (
                            <span key={tag} className="flex items-center gap-0.5 bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">
                                <Tag size={10} /> {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                }}
                className={cn(
                    "flex-shrink-0 transition-colors opacity-0 group-hover:opacity-100 ml-2 p-2 rounded-full",
                    theme === "dark"
                        ? "text-white/30 hover:bg-white/10 hover:text-red-400"
                        : "text-gray-400 hover:bg-gray-100 hover:text-red-500"
                )}
                aria-label="Delete task"
            >
                <Trash2 size={20} />
            </button>
        </div>
    );
}
