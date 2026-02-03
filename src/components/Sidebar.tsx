import { Plus, Inbox, Folder, Trash2, BarChart2 } from "lucide-react";
import { Project, Theme } from "../types";
import { cn } from "../utils";
import { useTranslation } from "react-i18next";
import { useState } from "react";

interface SidebarProps {
    projects: Project[];
    selectedProjectId: string | null;
    onSelectProject: (id: string | null) => void;
    onCreateProject: () => void;
    onDeleteProject: (id: string) => void;
    onOpenStats: () => void;
    isOpen: boolean;
    theme: Theme;
}

export function Sidebar({
    projects,
    selectedProjectId,
    onSelectProject,
    onCreateProject,
    onDeleteProject,
    onOpenStats,
    isOpen,
    theme
}: SidebarProps) {
    const { t } = useTranslation();
    const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);

    return (
        <aside
            className={cn(
                "fixed top-0 left-0 bottom-0 z-40 w-64 transition-transform duration-300 border-r pt-20 pb-4 px-4 flex flex-col",
                theme === "dark"
                    ? "bg-[#1a1c2c] border-white/10"
                    : "bg-gray-50 border-gray-200",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}
        >
            <div className="space-y-1 mb-6">
                <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-2 pl-2 opacity-60", theme === "dark" ? "text-white" : "text-gray-900")}>
                    {t("sidebar.library")}
                </h3>
                <button
                    onClick={() => onSelectProject(null)}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        selectedProjectId === null
                            ? (theme === "dark" ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600")
                            : (theme === "dark" ? "text-white/70 hover:bg-white/5 hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900")
                    )}
                >
                    <Inbox size={18} />
                    {t("sidebar.inbox")}
                </button>
                <button
                    onClick={onOpenStats}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        theme === "dark" ? "text-white/70 hover:bg-white/5 hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                >
                    <BarChart2 size={18} />
                    {t("stats.title")}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-2 pl-2 pr-1">
                    <h3 className={cn("text-xs font-bold uppercase tracking-wider opacity-60", theme === "dark" ? "text-white" : "text-gray-900")}>
                        {t("sidebar.projects")}
                    </h3>
                    <button
                        onClick={onCreateProject}
                        className={cn(
                            "p-1 rounded-md transition-colors",
                            theme === "dark" ? "hover:bg-white/10 text-white/50 hover:text-white" : "hover:bg-gray-200 text-gray-500 hover:text-gray-900"
                        )}
                        aria-label="Add Project"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                <div className="space-y-0.5">
                    {projects.map(project => (
                        <div
                            key={project.id}
                            className="relative group"
                            onMouseEnter={() => setHoveredProjectId(project.id)}
                            onMouseLeave={() => setHoveredProjectId(null)}
                        >
                            <button
                                onClick={() => onSelectProject(project.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    selectedProjectId === project.id
                                        ? (theme === "dark" ? "bg-white/10 text-white" : "bg-gray-200 text-gray-900")
                                        : (theme === "dark" ? "text-white/70 hover:bg-white/5 hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900")
                                )}
                            >
                                <span className="opacity-80" style={{ color: project.color }}>
                                    {/* Usually we'd map icon string to Component, effectively defaulting to Folder for non-matches or simplifiction */}
                                    <Folder size={18} />
                                </span>
                                <span className="truncate flex-1 text-left">{project.name}</span>
                            </button>

                            {/* Delete Button (visible on hover) */}
                            {hoveredProjectId === project.id && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteProject(project.id);
                                    }}
                                    className={cn(
                                        "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity",
                                        theme === "dark" ? "hover:bg-red-500/20 text-red-400" : "hover:bg-red-100 text-red-500"
                                    )}
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                    {projects.length === 0 && (
                        <div className={cn("text-xs px-3 py-4 text-center opacity-40", theme === "dark" ? "text-white" : "text-gray-500")}>
                            {t("sidebar.noProjects")}
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
