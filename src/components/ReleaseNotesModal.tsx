import { X, Sparkles } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { cn } from "../utils";

interface ReleaseNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    version: string;
    notes: string;
}

export function ReleaseNotesModal({ isOpen, onClose, version, notes }: ReleaseNotesModalProps) {
    const { theme } = useTheme();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div
                className={cn(
                    "w-full max-w-lg rounded-2xl shadow-2xl transform transition-all scale-100",
                    theme === "dark"
                        ? "bg-[#1a1c2c] border border-white/10 text-white"
                        : "bg-white text-gray-900"
                )}
            >
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "p-3 rounded-xl",
                                theme === "dark" ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"
                            )}>
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Updated to v{version}</h2>
                                <p className={cn("text-sm", theme === "dark" ? "text-white/60" : "text-gray-500")}>
                                    Lumina Task has been updated!
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100"
                            )}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className={cn(
                        "p-4 rounded-xl mb-6 max-h-[60vh] overflow-y-auto custom-scrollbar",
                        theme === "dark" ? "bg-black/20" : "bg-gray-50"
                    )}>
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                            {notes}
                        </pre>
                    </div>

                    <button
                        onClick={onClose}
                        className={cn(
                            "w-full py-3 rounded-xl font-medium transition-all duration-200",
                            theme === "dark"
                                ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-900/20"
                                : "bg-black text-white hover:bg-gray-800 shadow-lg shadow-gray-200"
                        )}
                    >
                        Awesome!
                    </button>
                </div>
            </div>
        </div>
    );
}
