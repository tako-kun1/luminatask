import { X, Keyboard, Maximize2, HelpCircle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { cn } from "../utils";
import { useTheme } from "../contexts/ThemeContext";

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode?: "default" | "welcome";
}

export function HelpModal({ isOpen, onClose, mode = "default" }: HelpModalProps) {
    const { t } = useTranslation();
    const { theme } = useTheme();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={cn(
                    "w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 border",
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

                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200/10">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                        <HelpCircle size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">
                            {mode === "welcome" ? t("help.welcomeTitle") : t("help.title")}
                        </h2>
                        <p className="opacity-60 text-sm">
                            {mode === "welcome" ? t("help.welcomeSubtitle") : t("help.subtitle")}
                        </p>
                    </div>
                </div>

                <div className="space-y-8 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                    {/* Section 1: Basic Usage */}
                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-wider opacity-70 mb-4 flex items-center gap-2 text-blue-400">
                            <CheckCircle2 size={16} /> {t("help.sections.basics")}
                        </h3>
                        <div className="space-y-4 text-sm opacity-90 leading-relaxed">
                            <div className="flex gap-3">
                                <span className="font-bold shrink-0 w-24">{t("help.basics.add")}</span>
                                <p className="opacity-80">{t("help.basics.addDesc")}</p>
                            </div>
                            <div className="flex gap-3">
                                <span className="font-bold shrink-0 w-24">{t("help.basics.edit")}</span>
                                <p className="opacity-80">{t("help.basics.editDesc")}</p>
                            </div>
                            <div className="flex gap-3">
                                <span className="font-bold shrink-0 w-24">{t("help.basics.organize")}</span>
                                <p className="opacity-80">{t("help.basics.organizeDesc")}</p>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Focus Mode */}
                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-wider opacity-70 mb-4 flex items-center gap-2 text-purple-400">
                            <Maximize2 size={16} /> {t("help.sections.focusMode")}
                        </h3>
                        <div className={cn(
                            "rounded-xl border p-4 text-sm leading-relaxed opacity-80",
                            theme === "dark" ? "border-white/10 bg-white/5" : "border-gray-100 bg-gray-50"
                        )}>
                            {t("help.focusModeDesc")}
                            <ul className="mt-3 space-y-1 list-disc list-inside opacity-90">
                                <li>{t("help.focusMode.feature1")}</li>
                                <li>{t("help.focusMode.feature2")}</li>
                                <li>{t("help.focusMode.feature3")}</li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 3: Shortcuts */}
                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-wider opacity-70 mb-4 flex items-center gap-2 text-orange-400">
                            <Keyboard size={16} /> {t("help.sections.shortcuts")}
                        </h3>
                        <div className={cn(
                            "rounded-xl border overflow-hidden",
                            theme === "dark" ? "border-white/10 bg-white/5" : "border-gray-100 bg-gray-50"
                        )}>
                            <div className={cn(
                                "flex items-center justify-between p-3 border-b",
                                theme === "dark" ? "border-white/5" : "border-gray-200/50"
                            )}>
                                <span className="font-medium font-mono bg-white/10 px-2 py-0.5 rounded text-xs">F1</span>
                                <span className="opacity-70 text-sm">{t("help.f1Desc")}</span>
                            </div>
                            <div className="flex items-center justify-between p-3">
                                <span className="font-medium font-mono bg-white/10 px-2 py-0.5 rounded text-xs">F11</span>
                                <span className="opacity-70 text-sm">{t("help.f11Desc")}</span>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="mt-8 text-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                    >
                        {mode === "welcome" ? "Get Started" : t("settings.close")}
                    </button>
                </div>
            </div>
        </div>
    );
}
