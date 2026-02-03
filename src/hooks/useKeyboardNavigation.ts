import { useState, useEffect, useCallback } from "react";
import { Task } from "../types";

interface UseKeyboardNavigationProps {
    tasks: Task[];
    onToggle: (id: string) => void;
    onEdit: (task: Task) => void;
    onDelete: (id: string) => void;
}

export function useKeyboardNavigation({
    tasks,
    onToggle,
    onEdit,
    onDelete,
}: UseKeyboardNavigationProps) {
    const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

    // Reset focus when tasks change significantly (optional, but good for filtering)
    // For now, we keep focus unless the focused task is deleted
    useEffect(() => {
        if (focusedTaskId && !tasks.find((t) => t.id === focusedTaskId)) {
            setFocusedTaskId(null);
        }
    }, [tasks, focusedTaskId]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Ignore if input is active
            if (
                document.activeElement instanceof HTMLInputElement ||
                document.activeElement instanceof HTMLTextAreaElement
            ) {
                return;
            }

            // Ignore if modifier keys are pressed (except Shift for some cases if needed)
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            switch (e.key) {
                case "j":
                case "ArrowDown":
                    e.preventDefault();
                    setFocusedTaskId((prev) => {
                        if (!tasks.length) return null;
                        if (!prev) return tasks[0].id;
                        const index = tasks.findIndex((t) => t.id === prev);
                        if (index === -1 || index === tasks.length - 1) return prev;
                        return tasks[index + 1].id;
                    });
                    break;

                case "k":
                case "ArrowUp":
                    e.preventDefault();
                    setFocusedTaskId((prev) => {
                        if (!tasks.length) return null;
                        if (!prev) return tasks[tasks.length - 1].id;
                        const index = tasks.findIndex((t) => t.id === prev);
                        if (index <= 0) return prev;
                        return tasks[index - 1].id;
                    });
                    break;

                case " ": // Space
                    e.preventDefault();
                    if (focusedTaskId) {
                        onToggle(focusedTaskId);
                    }
                    break;

                case "Enter":
                    e.preventDefault();
                    if (focusedTaskId) {
                        const task = tasks.find((t) => t.id === focusedTaskId);
                        if (task) onEdit(task);
                    }
                    break;

                case "Delete":
                case "Backspace":
                    // Prevent Backspace from navigating back in history (though usually not an issue in Tauri)
                    e.preventDefault();
                    if (focusedTaskId) {
                        onDelete(focusedTaskId);
                    }
                    break;

                case "Escape":
                    setFocusedTaskId(null);
                    break;

                case "n":
                    e.preventDefault();
                    // Focus the main input - requires a ref or ID. 
                    // We'll rely on App.tsx or a global event for this if complicated.
                    // For simple implementation, let's target by ID if possible, 
                    // or return a flag/callback.
                    const input = document.getElementById("task-input") as HTMLInputElement;
                    if (input) input.focus();
                    break;
            }
        },
        [tasks, focusedTaskId, onToggle, onEdit, onDelete]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    return { focusedTaskId, setFocusedTaskId };
}
