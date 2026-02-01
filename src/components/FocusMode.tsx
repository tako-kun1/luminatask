import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Cloud, Sun, CloudRain, CloudSnow, Loader2, Wind, CheckCircle2, Calendar, Tag, AlignLeft, ArrowDown, ArrowUp, ChevronUp, ChevronDown, Bell, Settings, Filter, Paperclip } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getCurrentPosition } from "@tauri-apps/plugin-geolocation";
import { openPath } from "@tauri-apps/plugin-opener";
import { message } from "@tauri-apps/plugin-dialog";
import { format, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";
import { ja } from "date-fns/locale";
import { Task } from "../types";
import { cn } from "../utils";
import { useTheme } from "../contexts/ThemeContext";

interface FocusModeProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    theme: "dark" | "light";
    onToggle: (id: string) => void;
    onMoveToTop: (id: string) => void;
    onReorder: (tasks: Task[]) => void;
    notification: { title: string; body: string } | null;
}

interface DailyForecast {
    code: number;
    maxTemp: number;
    minTemp: number;
}

interface WeatherData {
    today: DailyForecast;
    tomorrow: DailyForecast;
    currentWindSpeed: number;
}

// Helper to calculate countdown
const getCountdown = (dueDate?: number) => {
    if (!dueDate) return null;
    const now = Date.now();
    const diffDays = differenceInDays(dueDate, now);
    if (diffDays > 0) return `あと${diffDays}日`;
    if (diffDays < 0) return `${Math.abs(diffDays)}日遅れ`;

    const diffHours = differenceInHours(dueDate, now);
    if (diffHours > 0) return `あと${diffHours}時間`;

    const diffMins = differenceInMinutes(dueDate, now);
    if (diffMins > 0) return `あと${diffMins}分`;

    return "期限切れ";
};

// Task Row Component with Reorder Buttons
function TaskRow({
    t,
    index,
    isFirst,
    isLast,
    onMoveToTop,
    onToggle,
    onMoveUp,
    onMoveDown
}: {
    t: Task,
    index: number,
    isFirst: boolean,
    isLast: boolean,
    onMoveToTop: (id: string) => void,
    onToggle: (id: string) => void,
    onMoveUp: (id: string) => void,
    onMoveDown: (id: string) => void
}) {
    const countdown = getCountdown(t.dueDate);

    return (
        <div className="flex items-center gap-4 group p-3 rounded-xl hover:bg-white/5 transition-all cursor-default select-none border border-transparent hover:border-white/5">
            {/* Reorder Buttons */}
            <div className="flex flex-col gap-1 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onMoveUp(t.id); }}
                    disabled={isFirst}
                    className="p-0.5 hover:bg-white/10 rounded disabled:opacity-30 disabled:hover:bg-transparent hover:text-white/80 transition-colors"
                >
                    <ChevronUp size={14} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onMoveDown(t.id); }}
                    disabled={isLast}
                    className="p-0.5 hover:bg-white/10 rounded disabled:opacity-30 disabled:hover:bg-transparent hover:text-white/80 transition-colors"
                >
                    <ChevronDown size={14} />
                </button>
            </div>

            <span className="text-white/20 font-mono text-sm w-4">0{index + 2}</span>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <p className="truncate font-medium text-white/90 text-lg">{t.text}</p>

                    {/* Priority Indicator */}
                    {t.priority && (
                        <span className={cn(
                            "w-2 h-2 rounded-full",
                            t.priority === 'high' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" :
                                t.priority === 'medium' ? "bg-orange-500" : "bg-blue-500"
                        )} />
                    )}
                </div>

                {/* Meta Row: Due Date & Countdown */}
                {(t.dueDate || countdown) && (
                    <div className="flex items-center gap-3 text-xs text-white/50 font-mono">
                        {t.dueDate && (
                            <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {format(t.dueDate, "MM/dd")}
                            </span>
                        )}
                        {countdown && (
                            <span className={cn(
                                "flex items-center gap-1 font-bold",
                                countdown.includes("遅れ") || countdown.includes("期限切れ") ? "text-red-400" : "text-blue-300"
                            )}>
                                {countdown}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onMoveToTop(t.id); }}
                    className="p-2 rounded-full hover:bg-white/10 text-white/30 hover:text-blue-400 transition-all"
                    title="優先タスクにする"
                >
                    <ArrowUp size={18} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggle(t.id); }}
                    className="p-2 rounded-full hover:bg-white/10 text-white/30 hover:text-green-400 transition-all"
                    title="完了にする"
                >
                    <CheckCircle2 size={18} />
                </button>
            </div>
        </div>
    );
}

export function FocusMode({ isOpen, onClose, tasks, theme, onToggle, onMoveToTop, onReorder, notification }: FocusModeProps) {
    const { t } = useTranslation();
    const { locationMode, manualCoordinates, showWeather } = useTheme();
    const [time, setTime] = useState(new Date());
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loadingWeather, setLoadingWeather] = useState(false);
    const [error, setError] = useState("");
    const [showNotification, setShowNotification] = useState(false);
    const [currentNotification, setCurrentNotification] = useState<{ title: string; body: string } | null>(null);

    // Filtering State
    const [filterTag, setFilterTag] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    // Collect all unique tags
    const allTags = Array.from(new Set(tasks.flatMap(t => t.tags || [])));

    // Handle Notification
    useEffect(() => {
        if (notification) {
            setCurrentNotification(notification);
            setShowNotification(true);
            const timer = setTimeout(() => setShowNotification(false), 6000); // 6 seconds
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // FILTERED TASKS LOGIC
    const filteredTasks = tasks.filter(task => {
        if (!filterTag) return true;
        return task.tags?.includes(filterTag);
    });

    const remainingTasks = filteredTasks.filter(t => !t.completed);
    const nextTask = remainingTasks[0]; // Top priority task
    const upcomingTasks = remainingTasks.slice(1); // All subsequent tasks

    // Reorder Handlers (Need to map back to original full list if filtering? 
    // Complexity: If filtered, reordering might be weird. 
    // Strategy: If filtered, disable reordering or apply reorder to the subset and try to merge?
    // User Requirement: "表示するタスクをタグで絞ったり出来るように"
    // Reordering usually implies global order.
    // For safety, let's disable reordering arrows when filtered, OR apply move within the global list context.
    // Simplifying: Hide arrows if filter is active, or handle carefully.
    // Given the "onReorder" takes the full list, implementing drag/drop or move in filtered view is hard.
    // Let's hide Up/Down buttons if filtering is active.

    const handleMoveUp = (id: string) => {
        if (filterTag) return; // Disable reorder in filter mode
        const index = remainingTasks.findIndex(t => t.id === id);
        if (index <= 1) return;

        const newTasks = [...remainingTasks];
        [newTasks[index], newTasks[index - 1]] = [newTasks[index - 1], newTasks[index]];

        // Combine with completed tasks (from original list? No, remainingTasks is from filtered)
        // If filter is OFF, remainingTasks == all incomplete.
        const combinedTasks = [...newTasks, ...tasks.filter(t => t.completed)];
        onReorder(combinedTasks);
    };

    const handleMoveDown = (id: string) => {
        if (filterTag) return; // Disable reorder in filter mode
        const index = remainingTasks.findIndex(t => t.id === id);
        if (index === -1 || index >= remainingTasks.length - 1) return;

        const newTasks = [...remainingTasks];
        [newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]];

        const combinedTasks = [...newTasks, ...tasks.filter(t => t.completed)];
        onReorder(combinedTasks);
    };

    // Handle Fullscreen & Scrollbar
    useEffect(() => {
        const appWindow = getCurrentWindow();
        if (isOpen) {
            appWindow.setFullscreen(true);
            document.body.style.overflow = "hidden";
        } else {
            appWindow.setFullscreen(false);
            document.body.style.overflow = "unset";
        }
        return () => {
            if (isOpen) {
                appWindow.setFullscreen(false);
                document.body.style.overflow = "unset";
            }
        };
    }, [isOpen]);

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Weather Fetching
    useEffect(() => {
        if (!isOpen) return;
        setLoadingWeather(true);
        const fetchWeather = async () => {
            try {
                let latitude, longitude;
                if (locationMode === "manual") {
                    latitude = manualCoordinates.latitude;
                    longitude = manualCoordinates.longitude;
                } else {
                    try {
                        // Try native geolocation first
                        const location = await getCurrentPosition({ enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
                        if (!location) throw new Error("位置情報が見つかりません");
                        latitude = location.coords.latitude;
                        longitude = location.coords.longitude;
                    } catch (geoError) {
                        console.warn("Native geolocation failed, falling back to IP:", geoError);
                        // Fallback: IP-based Geolocation
                        try {
                            const res = await fetch("https://ipapi.co/json/");
                            if (!res.ok) throw new Error("IP Geolocation failed");
                            const data = await res.json();
                            latitude = data.latitude;
                            longitude = data.longitude;
                        } catch (ipError) {
                            console.error("IP fallback failed:", ipError);
                            throw new Error("位置情報を取得できませんでした (GPS/IP)");
                        }
                    }
                }

                if (!latitude || !longitude) throw new Error("座標が無効です");

                const res = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&current=wind_speed_10m&forecast_days=2&timezone=auto`
                );
                const data = await res.json();
                if (!data.daily || !data.daily.weather_code || data.daily.weather_code.length < 2) throw new Error("天気データが無効です");
                setWeather({
                    today: { code: data.daily.weather_code[0], maxTemp: data.daily.temperature_2m_max[0], minTemp: data.daily.temperature_2m_min[0] },
                    tomorrow: { code: data.daily.weather_code[1], maxTemp: data.daily.temperature_2m_max[1], minTemp: data.daily.temperature_2m_min[1] },
                    currentWindSpeed: data.current.wind_speed_10m
                });
                setError("");
            } catch (e) {
                console.error("Weather fetch error", e);
                setError(locationMode === "manual" ? "指定された座標の天気取得に失敗しました" : "位置情報または天気の取得に失敗しました");
            } finally {
                setLoadingWeather(false);
            }
        };
        fetchWeather();
    }, [isOpen, locationMode, manualCoordinates]);

    if (!isOpen) return null;

    // Helper to get weather icon
    const getWeatherIcon = (code: number, sizeClass: string = "w-12 h-12") => {
        const className = `${sizeClass}`;
        if (code <= 3) return <Sun className={`${className} text-yellow-400`} />;
        if (code <= 48) return <Cloud className={`${className} text-gray-400`} />;
        if (code <= 67) return <CloudRain className={`${className} text-blue-400`} />;
        if (code <= 77) return <CloudSnow className={`${className} text-white`} />;
        if (code <= 82) return <CloudRain className={`${className} text-blue-500`} />;
        if (code <= 99) return <Wind className={`${className} text-purple-400`} />;
        return <Sun className={className} />;
    };
    const getWeatherDesc = (code: number) => {
        if (code === 0) return "快晴";
        if (code === 1) return "晴れ";
        if (code === 2) return "一部曇り";
        if (code === 3) return "曇り";
        if (code <= 48) return "霧";
        if (code <= 67) return "雨";
        if (code <= 77) return "雪";
        if (code <= 86) return "にわか雪";
        if (code <= 99) return "雷雨";
        return "不明";
    };

    // Priority Styles Helper
    const getPriorityStyles = (priority?: string) => {
        switch (priority) {
            case "high":
                return {
                    border: "border-red-500/20",
                    gradient: "from-red-500/20 to-purple-900/20",
                    accent: "bg-red-500",
                    text: "text-red-300",
                    badge: "bg-red-500/10 border-red-500/20 text-red-300"
                };
            case "medium":
                return {
                    border: "border-orange-500/20",
                    gradient: "from-orange-500/20 to-purple-900/20",
                    accent: "bg-orange-500",
                    text: "text-orange-300",
                    badge: "bg-orange-500/10 border-orange-500/20 text-orange-300"
                };
            default:
                return {
                    border: "border-blue-500/20",
                    gradient: "from-blue-500/20 to-purple-900/20",
                    accent: "bg-blue-500",
                    text: "text-blue-300",
                    badge: "bg-blue-500/10 border-blue-500/20 text-blue-300"
                };
        }
    };

    const currentStyles = getPriorityStyles(nextTask?.priority);
    const mainCountdown = getCountdown(nextTask?.dueDate);

    return (
        <div className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center p-4 md:p-8 transition-all duration-700 animate-in fade-in zoom-in-95",
            theme === "dark" ? "bg-black/85" : "bg-black/70",
            "backdrop-blur-3xl text-white overflow-hidden"
        )}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] animate-pulse" style={{ animationDuration: '6s' }} />
            </div>

            {/* In-App Notification Popup */}
            <div className={cn(
                "absolute top-8 right-24 z-50 max-w-sm w-full bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl transition-all duration-500 transform",
                showNotification ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0 pointer-events-none"
            )}>
                <div className="flex gap-3 items-start">
                    <div className="p-2 bg-blue-500/20 text-blue-300 rounded-lg shrink-0">
                        <Bell size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-sm mb-1">{currentNotification?.title}</h4>
                        <p className="text-white/70 text-sm leading-relaxed">{currentNotification?.body}</p>
                    </div>
                    <button
                        onClick={() => setShowNotification(false)}
                        className="ml-auto text-white/40 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            <button
                onClick={onClose}
                className="absolute top-4 right-4 md:top-8 md:right-8 p-3 md:p-4 rounded-full bg-white/10 hover:bg-white/20 transition-all z-50"
            >
                <X size={24} className="md:w-8 md:h-8" />
            </button>

            {/* Time Section */}
            <div className="flex flex-col items-center mb-4 shrink-0">
                <h1 className="text-7xl md:text-9xl lg:text-[10rem] leading-none font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-white/50 drop-shadow-2xl">
                    {format(time, "HH:mm")}
                </h1>
                <p className="text-xl md:text-2xl mt-2 font-light tracking-widest text-white/60">
                    {format(time, "MM月dd日 EEEE", { locale: ja })}
                </p>
            </div>

            {/* Filtering Mode Indicator */}
            {filterTag && (
                <div className="absolute top-8 left-8 z-40 bg-blue-500/20 border border-blue-500/30 text-blue-200 px-4 py-2 rounded-full flex items-center gap-2">
                    <Filter size={16} />
                    <span>Filtered by: <b>#{filterTag}</b></span>
                    <button onClick={() => setFilterTag(null)} className="ml-2 hover:text-white"><X size={14} /></button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full max-w-7xl flex-1 min-h-0 h-auto pb-4">
                {/* Left Column: Weather & Upcoming */}
                <div className="flex flex-col gap-4 h-full min-h-0">
                    {/* Weather Card */}
                    {showWeather && (
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-md flex flex-col justify-center text-center transform hover:scale-[1.02] transition-all duration-500 shrink-0 min-h-0 overflow-hidden">
                            {loadingWeather ? (
                                <Loader2 className="w-12 h-12 animate-spin text-white/50 mx-auto" />
                            ) : error ? (
                                <p className="text-red-400">{error}</p>
                            ) : weather ? (
                                <div className="flex flex-col h-full bg-black/10 rounded-2xl p-4 border border-white/5">
                                    <div className="flex-1 flex gap-2"> {/* Row for 2 days */}

                                        {/* Today */}
                                        <div className="flex-1 flex flex-col items-center justify-center border-r border-white/10 pr-2">
                                            <p className="text-sm font-bold opacity-60 uppercase mb-2">{t("focusMode.today")}</p>
                                            <div className="mb-2">{getWeatherIcon(weather.today.code, "w-16 h-16")}</div>
                                            <p className="text-lg font-medium mb-1">{getWeatherDesc(weather.today.code)}</p>
                                            <div className="flex gap-3 text-sm font-mono mt-2">
                                                <span className="text-red-300 flex items-center gap-1"><ArrowUp size={14} />{weather.today.maxTemp}°</span>
                                                <span className="text-blue-300 flex items-center gap-1"><ArrowDown size={14} />{weather.today.minTemp}°</span>
                                            </div>
                                        </div>

                                        {/* Tomorrow */}
                                        <div className="flex-1 flex flex-col items-center justify-center pl-2">
                                            <p className="text-sm font-bold opacity-60 uppercase mb-2">{t("focusMode.tomorrow")}</p>
                                            <div className="mb-2 opacity-80">{getWeatherIcon(weather.tomorrow.code, "w-16 h-16")}</div>
                                            <p className="text-lg font-medium mb-1 opacity-80">{getWeatherDesc(weather.tomorrow.code)}</p>
                                            <div className="flex gap-3 text-sm font-mono mt-2 opacity-80">
                                                <span className="text-red-300 flex items-center gap-1"><ArrowUp size={14} />{weather.tomorrow.maxTemp}°</span>
                                                <span className="text-blue-300 flex items-center gap-1"><ArrowDown size={14} />{weather.tomorrow.minTemp}°</span>
                                            </div>
                                        </div>

                                    </div>

                                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-center">
                                        <div className="flex gap-2 text-white/40 bg-white/5 px-4 py-1.5 rounded-full text-xs">
                                            <Wind size={14} /> <span>{t("focusMode.windSpeed", { speed: weather.currentWindSpeed })}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p>{t("focusMode.weatherLoading")}</p>
                            )}
                        </div>
                    )}

                    {/* Upcoming Tasks */}
                    <div className="flex-1 min-h-0 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md flex flex-col overflow-hidden">
                        <div className="p-5 pb-3 shrink-0 flex justify-between items-center">
                            <p className="text-xs text-white/40 font-bold tracking-widest uppercase">
                                {t("focusMode.upcoming")} {filterTag && `(#${filterTag})`}
                            </p>
                            <span className="text-xs text-white/20 font-mono">{upcomingTasks.length} TASKS</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-5">
                            <div className="space-y-3">
                                {upcomingTasks.length > 0 ? (
                                    upcomingTasks.map((t, i) => (
                                        <TaskRow
                                            key={t.id}
                                            t={t}
                                            index={i}
                                            isFirst={i === 0 && !filterTag} // Disable arrows if filtered
                                            isLast={i === upcomingTasks.length - 1 && !filterTag}
                                            onMoveToTop={onMoveToTop}
                                            onToggle={onToggle}
                                            onMoveUp={handleMoveUp}
                                            onMoveDown={handleMoveDown}
                                        />
                                    ))
                                ) : (
                                    <p className="text-white/30 text-sm italic text-center py-4">
                                        {nextTask ? t("focusMode.noNextTask") : t("focusMode.noTasks")}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Current Focus Details */}
                <div className={cn(
                    "flex flex-col h-full rounded-3xl p-8 backdrop-blur-md relative overflow-hidden group border transition-colors duration-500",
                    "bg-gradient-to-br",
                    nextTask ? currentStyles.gradient : "from-blue-500/20 to-purple-500/20",
                    nextTask ? currentStyles.border : "border-white/10"
                )}>
                    {nextTask && <div className={cn("absolute top-0 left-0 w-2 h-full transition-colors duration-500", currentStyles.accent)} />}
                    {!nextTask && <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />}

                    <div className="flex justify-between items-start mb-6">
                        <p className={cn("text-sm font-bold tracking-widest uppercase transition-colors duration-500", nextTask ? currentStyles.text : "text-blue-300")}>
                            {t("focusMode.title")}
                        </p>
                        <span className="text-4xl font-bold opacity-20">#1</span>
                    </div>

                    {nextTask ? (
                        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pr-2">
                            <h2 className="text-4xl font-bold leading-tight mb-4">{nextTask.text}</h2>

                            {/* Countdown / Meta for Main Task */}
                            {mainCountdown && (
                                <div className="mb-6">
                                    <span className={cn(
                                        "text-2xl font-mono font-bold",
                                        mainCountdown.includes("遅れ") || mainCountdown.includes("期限切れ") ? "text-red-400" : "text-blue-300"
                                    )}>
                                        {mainCountdown}
                                    </span>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-4 mb-8">
                                {/* Priority Badge */}
                                <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border uppercase text-xs font-bold tracking-wider", currentStyles.badge)}>
                                    <span>{t("task.priority.label")}: {t(`task.priority.${nextTask.priority || "none"}`)}</span>
                                </div>

                                {/* Due Date Badge */}
                                {nextTask.dueDate && (
                                    <div className="flex items-center gap-2 text-white/60 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                        <Calendar size={16} />
                                        <span>{format(nextTask.dueDate, "yyyy/MM/dd HH:mm")}</span>
                                    </div>
                                )}

                                {/* Tags */}
                                {nextTask.tags && nextTask.tags.map(tag => (
                                    <div key={tag} className="flex items-center gap-2 text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">
                                        <Tag size={16} />
                                        <span>{tag}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Memo / Notes */}
                            {nextTask.notes && (
                                <div className="mb-8 p-4 bg-black/20 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2 text-white/40 mb-2 text-sm font-medium">
                                        <AlignLeft size={14} /> {t("task.notes.label")}
                                    </div>
                                    <p className="text-white/80 whitespace-pre-wrap leading-relaxed">
                                        {nextTask.notes}
                                    </p>
                                </div>
                            )}

                            {/* Attachments */}
                            {nextTask.attachments && nextTask.attachments.length > 0 && (
                                <div className="mb-8">
                                    <div className="flex items-center gap-2 text-white/40 mb-3 text-sm font-medium">
                                        <Paperclip size={14} /> {t("task.attachments.label", "添付ファイル")}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {nextTask.attachments.map((path, i) => {
                                            // Extract filename for display
                                            const filename = path.replace(/^.*[\\/]/, '') || path;
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={async () => {
                                                        try {
                                                            await openPath(path);
                                                        } catch (e) {
                                                            console.error(e);
                                                            await message(`ファイルを開けませんでした: ${e}`, { title: "エラー", kind: "error" });
                                                        }
                                                    }}
                                                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-sm text-blue-300 hover:text-blue-200"
                                                >
                                                    <Paperclip size={14} />
                                                    <span className="truncate max-w-[200px]">{filename}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="mt-auto pt-8">
                                <button
                                    onClick={() => onToggle(nextTask.id)}
                                    className={cn(
                                        "w-full py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 font-bold text-lg text-white",
                                        nextTask.priority === 'high' ? "bg-red-500 hover:bg-red-600 shadow-red-500/30" :
                                            nextTask.priority === 'medium' ? "bg-orange-500 hover:bg-orange-600 shadow-orange-500/30" :
                                                "bg-blue-500 hover:bg-blue-600 shadow-blue-500/30"
                                    )}
                                >
                                    <CheckCircle2 size={24} />
                                    {t("task.actions.complete")}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-white/50 italic text-2xl">
                            {t("focusMode.allComplete")}
                        </div>
                    )}
                </div>
            </div>

            {/* Settings (Filter) Button - Bottom Right */}
            <div className="absolute bottom-8 right-8 z-50">
                <div className="relative">
                    {showSettings && (
                        <div className="absolute bottom-16 right-0 w-64 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Filter size={14} /> Filter by Tag
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setFilterTag(null)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                        filterTag === null
                                            ? "bg-white text-black border-white"
                                            : "bg-white/5 text-white/50 border-white/5 hover:bg-white/10"
                                    )}
                                >
                                    ALL
                                </button>
                                {allTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setFilterTag(tag === filterTag ? null : tag)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                            filterTag === tag
                                                ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30"
                                                : "bg-white/5 text-white/70 border-white/5 hover:bg-white/10"
                                        )}
                                    >
                                        #{tag}
                                    </button>
                                ))}
                                {allTags.length === 0 && <span className="text-white/30 text-xs italic">No tags available</span>}
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={cn(
                            "p-4 rounded-full transition-all shadow-xl backdrop-blur-md border",
                            showSettings || filterTag
                                ? "bg-blue-500 text-white border-blue-400 shadow-blue-500/30"
                                : "bg-white/10 text-white/60 border-white/10 hover:bg-white/20 hover:text-white"
                        )}
                    >
                        {filterTag ? <Filter size={24} /> : <Settings size={24} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
