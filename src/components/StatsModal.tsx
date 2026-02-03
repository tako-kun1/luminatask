import { X, TrendingUp, CheckCircle, Circle, BarChart2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../utils";
import { Theme, Task, Project } from "../types";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";
import { format, subDays, isSameDay } from "date-fns";

interface StatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    projects: Project[];
    theme: Theme;
}

export function StatsModal({ isOpen, onClose, tasks, projects, theme }: StatsModalProps) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    // --- Statistics Logic ---
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 1. Weekly Activity (Last 7 Days)
    const today = new Date();
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(today, 6 - i);
        return {
            date: d,
            label: format(d, "MM/dd"), // or localized
            count: 0
        };
    });

    tasks.forEach(task => {
        if (task.completed && task.completedAt) {
            const doneDate = new Date(task.completedAt);
            const dayStat = last7Days.find(d => isSameDay(d.date, doneDate));
            if (dayStat) {
                dayStat.count++;
            }
        }
    });

    // 2. Project Distribution (Active + Completed)
    // Map project ID to count
    const projectCounts: Record<string, number> = {};
    let inboxCount = 0;

    tasks.forEach(task => {
        if (task.projectId) {
            projectCounts[task.projectId] = (projectCounts[task.projectId] || 0) + 1;
        } else {
            inboxCount++;
        }
    });

    const pieData = projects.map(p => ({
        name: p.name,
        value: projectCounts[p.id] || 0,
        color: p.color
    })).filter(d => d.value > 0);

    if (inboxCount > 0) {
        pieData.push({
            name: t("sidebar.inbox"),
            value: inboxCount,
            color: "#9ca3af" // Gray
        });
    }

    // Colors for charts
    const barColor = theme === "dark" ? "#60a5fa" : "#3b82f6"; // Blue
    const tooltipStyle = theme === "dark"
        ? { backgroundColor: "#1f2937", border: "1px solid #374151", color: "#fff" }
        : { backgroundColor: "#fff", border: "1px solid #e5e7eb", color: "#111" };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={cn(
                "w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all",
                theme === "dark" ? "bg-[#181825] border border-white/10" : "bg-white"
            )}>
                {/* Header */}
                <div className={cn(
                    "p-6 border-b flex justify-between items-center",
                    theme === "dark" ? "border-white/5 bg-white/5" : "border-gray-100 bg-gray-50/50"
                )}>
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", theme === "dark" ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600")}>
                            <TrendingUp size={24} />
                        </div>
                        <h2 className={cn("text-xl font-bold", theme === "dark" ? "text-white" : "text-gray-900")}>
                            {t("stats.title")}
                        </h2>
                    </div>

                    <button
                        onClick={onClose}
                        className={cn(
                            "p-2 rounded-full transition-colors flex-shrink-0",
                            theme === "dark" ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-200 text-gray-400 hover:text-gray-700"
                        )}
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={cn("p-4 rounded-2xl border flex items-center gap-4", theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100")}>
                            <div className="p-3 rounded-full bg-green-500/20 text-green-500">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <div className="text-sm opacity-60">{t("stats.completed")}</div>
                                <div className="text-2xl font-bold">{completedTasks}</div>
                            </div>
                        </div>
                        <div className={cn("p-4 rounded-2xl border flex items-center gap-4", theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100")}>
                            <div className="p-3 rounded-full bg-blue-500/20 text-blue-500">
                                <Circle size={24} />
                            </div>
                            <div>
                                <div className="text-sm opacity-60">{t("stats.total")}</div>
                                <div className="text-2xl font-bold">{totalTasks}</div>
                            </div>
                        </div>
                        <div className={cn("p-4 rounded-2xl border flex items-center gap-4", theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100")}>
                            <div className="p-3 rounded-full bg-purple-500/20 text-purple-500">
                                <BarChart2 size={24} />
                            </div>
                            <div>
                                <div className="text-sm opacity-60">{t("stats.rate")}</div>
                                <div className="text-2xl font-bold">{completionRate}%</div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Weekly Activity Chart */}
                        <div className={cn("p-6 rounded-3xl border", theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-100")}>
                            <h3 className="font-bold mb-6 opacity-80">{t("stats.weekly")}</h3>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={last7Days}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                        <XAxis
                                            dataKey="label"
                                            stroke={theme === "dark" ? "#9ca3af" : "#6b7280"}
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke={theme === "dark" ? "#9ca3af" : "#6b7280"}
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            contentStyle={tooltipStyle}
                                            cursor={{ fill: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}
                                        />
                                        <Bar dataKey="count" fill={barColor} radius={[4, 4, 0, 0]} barSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Project Distribution Chart */}
                        <div className={cn("p-6 rounded-3xl border", theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-100")}>
                            <h3 className="font-bold mb-6 opacity-80">{t("stats.projectDist")}</h3>
                            <div className="h-[250px] w-full">
                                {pieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={tooltipStyle} />
                                            <Legend
                                                layout="vertical"
                                                verticalAlign="middle"
                                                align="right"
                                                iconType="circle"
                                                className="text-xs"
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center opacity-40">
                                        {t("stats.noData")}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
