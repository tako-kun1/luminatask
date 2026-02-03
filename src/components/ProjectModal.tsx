import { X, Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../utils";
import { Theme } from "../types";

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, color: string, icon: string) => void;
    theme: Theme;
}

const COLORS = [
    "#EF4444", // Red
    "#F59E0B", // Amber
    "#10B981", // Emerald
    "#3B82F6", // Blue
    "#8B5CF6", // Violet
    "#EC4899", // Pink
    "#64748B", // Slate
];

export function ProjectModal({ isOpen, onClose, onCreate, theme }: ProjectModalProps) {
    const { t } = useTranslation();
    const [name, setName] = useState("");
    const [color, setColor] = useState(COLORS[3]); // Default Blue

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onCreate(name, color, "folder"); // Default icon 'folder' for now
        setName("");
        setColor(COLORS[3]);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={cn(
                    "w-full max-w-sm rounded-2xl shadow-xl p-6 relative animate-in zoom-in-95 duration-200 border",
                    theme === "dark"
                        ? "bg-gray-900 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-900"
                )}
            >
                <button
                    onClick={onClose}
                    className={cn(
                        "absolute top-4 right-4 p-2 rounded-full transition-colors",
                        theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100"
                    )}
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold mb-6">{t("project.createTitle")}</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium opacity-70 mb-2">
                            {t("project.nameLabel")}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t("project.placeholder")}
                            className={cn(
                                "w-full px-4 py-2 rounded-lg border bg-transparent outline-none focus:ring-2 focus:ring-blue-500/50",
                                theme === "dark"
                                    ? "border-white/10 focus:border-blue-500/50"
                                    : "border-gray-200 focus:border-blue-500"
                            )}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium opacity-70 mb-2">
                            {t("project.colorLabel")}
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={cn(
                                        "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                                        color === c
                                            ? "border-white shadow-lg scale-110 ring-2 ring-blue-500/50"
                                            : "border-transparent opacity-70 hover:opacity-100"
                                    )}
                                    style={{ backgroundColor: c }}
                                >
                                    {color === c && <Check size={14} className="mx-auto text-white drop-shadow-sm" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className={cn(
                                "px-6 py-2 rounded-lg font-medium transition-all",
                                !name.trim()
                                    ? "opacity-50 cursor-not-allowed bg-gray-500/20"
                                    : "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                            )}
                        >
                            {t("project.createAction")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
