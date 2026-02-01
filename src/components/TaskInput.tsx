import { useState, FormEvent } from "react";
import { Plus } from "lucide-react";
import { cn } from "../utils";
import { useTranslation } from "react-i18next";

interface TaskInputProps {
    onAdd: (text: string) => void;
    theme?: "dark" | "light";
}

export function TaskInput({ onAdd, theme = "dark" }: TaskInputProps) {
    const { t } = useTranslation();
    const [text, setText] = useState("");

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onAdd(text.trim());
            setText("");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative mb-8">
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("task.placeholder")}
                className={cn(
                    "w-full px-6 py-4 text-lg transition-all",
                    "backdrop-blur-md rounded-2xl shadow-xl",
                    "focus:outline-none transition-all pr-14",
                    theme === "dark"
                        ? "text-white placeholder:text-white/40 bg-white/5 border border-white/10 focus:bg-white/10 focus:border-white/30"
                        : "text-gray-800 placeholder:text-gray-400 bg-white border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                )}
            />
            <button
                type="submit"
                disabled={!text.trim()}
                className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2",
                    "p-2 rounded-xl text-white shadow-lg",
                    "hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                    theme === "dark"
                        ? "bg-gradient-to-tr from-blue-500 to-purple-500 shadow-blue-500/30"
                        : "bg-gradient-to-tr from-blue-600 to-purple-600 shadow-blue-600/30"
                )}
            >
                <Plus size={24} />
            </button>
        </form>
    );
}
