import { useRef, useEffect } from "react";
import { Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "../utils";
import { Task } from "../types";
import { useTranslation } from "react-i18next";

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onToggle: () => void;
    task: Task;
    theme: "dark" | "light";
}

export function ContextMenu({ x, y, onClose, onEdit, onDelete, onToggle, task, theme }: ContextMenuProps) {
    const { t } = useTranslation();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        // Prevent default context menu on this custom menu
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            onClose();
        };
        document.addEventListener("contextmenu", handleContextMenu);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
            document.removeEventListener("contextmenu", handleContextMenu);
        };
    }, [onClose]);

    // Adjust position if off-screen (basic simple logic)
    // For a robust solution, measuring window size would be better, but this suffices for typical use
    const style = {
        top: y,
        left: x,
    };

    return (
        <div
            ref={ref}
            style={style}
            className={cn(
                "fixed z-50 min-w-[180px] rounded-xl shadow-2xl backdrop-blur-xl border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100",
                theme === "dark"
                    ? "bg-[#1f1f33]/90 border-white/10 text-white"
                    : "bg-white/90 border-gray-200 text-gray-800"
            )}
        >
            <button
                onClick={() => { onToggle(); onClose(); }}
                className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left",
                    theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100"
                )}
            >
                {task.completed ? <XCircle size={16} className="text-gray-400" /> : <CheckCircle2 size={16} className="text-green-500" />}
                {task.completed ? t("task.actions.incomplete") : t("task.actions.complete")}
            </button>

            <button
                onClick={() => { onEdit(); onClose(); }}
                className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left",
                    theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100"
                )}
            >
                <Edit2 size={16} className="text-blue-400" />
                {t("task.actions.edit")}
            </button>

            <div className={cn("h-px w-full", theme === "dark" ? "bg-white/10" : "bg-gray-200")} />

            <button
                onClick={() => { onDelete(); onClose(); }}
                className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left text-red-500",
                    theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100"
                )}
            >
                <Trash2 size={16} />
                {t("task.actions.delete")}
            </button>
        </div>
    );
}
