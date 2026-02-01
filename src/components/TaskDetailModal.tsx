import { useState, useEffect } from "react";
import { format, set } from "date-fns";
import { Task, RecurrenceRule } from "../types";
import { X, Calendar, Flag, Tag, AlignLeft, Clock, Bell, Repeat, Paperclip, Trash2 } from "lucide-react";
import { cn } from "../utils";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";

interface TaskDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    onUpdate: (updatedTask: Task) => void;
    theme: "dark" | "light";
    allTasks: Task[];
}

export function TaskDetailModal({ isOpen, onClose, task, onUpdate, theme, allTasks }: TaskDetailModalProps) {
    const { t } = useTranslation();
    const [editedTask, setEditedTask] = useState<Task | null>(null);
    const [newTag, setNewTag] = useState("");
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);

    // Separate states for date and time inputs
    const [datePart, setDatePart] = useState("");
    const [timePart, setTimePart] = useState("");
    const [notificationOffset, setNotificationOffset] = useState<number | undefined>(undefined);

    // Recurrence State
    const [recurrenceFreq, setRecurrenceFreq] = useState<"none" | "daily" | "weekly" | "monthly">("none");
    const [recurrenceInterval, setRecurrenceInterval] = useState(1);
    const [recurrenceWeekDays, setRecurrenceWeekDays] = useState<number[]>([]);
    const [recurrenceMonthDays, setRecurrenceMonthDays] = useState<number[]>([]);

    useEffect(() => {
        setEditedTask(task);
        if (task && task.dueDate) {
            const date = new Date(task.dueDate);
            setDatePart(format(date, "yyyy-MM-dd"));
            setTimePart(task.includeTime ? format(date, "HH:mm") : "");
            setNotificationOffset(task.notificationOffset);
        } else {
            setDatePart("");
            setTimePart("");
            setNotificationOffset(undefined);
        }

        if (task?.recurrenceRule) {
            setRecurrenceFreq(task.recurrenceRule.freq);
            setRecurrenceInterval(task.recurrenceRule.interval);
            setRecurrenceWeekDays(task.recurrenceRule.weekDays || []);
            setRecurrenceMonthDays(task.recurrenceRule.monthDays || []);
        } else {
            setRecurrenceFreq("none");
            setRecurrenceInterval(1);
            setRecurrenceWeekDays([]);
            setRecurrenceMonthDays([]);
        }
    }, [task]);

    if (!isOpen || !editedTask) return null;

    const handleSave = () => {
        if (editedTask) {
            // Combine date and time
            let finalTimestamp: number | undefined;

            if (datePart && timePart) {
                const date = new Date(datePart);
                const [hours, minutes] = timePart.split(":").map(Number);
                const combined = set(date, { hours, minutes });
                finalTimestamp = combined.getTime();
            } else if (datePart) {
                const date = new Date(datePart);
                const combined = set(date, { hours: 0, minutes: 0 });
                finalTimestamp = combined.getTime();
            } else if (timePart) {
                const today = new Date();
                const [hours, minutes] = timePart.split(":").map(Number);
                const combined = set(today, { hours, minutes, seconds: 0, milliseconds: 0 });
                finalTimestamp = combined.getTime();
            } else {
                finalTimestamp = undefined;
            }

            const includeTime = !!timePart;

            // Build Recurrence Rule
            let recurrenceRule: RecurrenceRule | undefined = undefined;
            if (recurrenceFreq !== "none") {
                recurrenceRule = {
                    freq: recurrenceFreq,
                    interval: recurrenceInterval,
                    weekDays: recurrenceFreq === "weekly" ? recurrenceWeekDays : undefined,
                    monthDays: recurrenceFreq === "monthly" ? recurrenceMonthDays : undefined
                };
            }

            onUpdate({
                ...editedTask,
                dueDate: finalTimestamp,
                includeTime,
                notificationOffset,
                recurrenceRule,
                attachments: editedTask.attachments
            });
            onClose();
        }
    };

    const updateField = (field: keyof Task, value: any) => {
        setEditedTask((prev) => prev ? { ...prev, [field]: value } : null);
    };

    // Tag Management
    const existingTags = Array.from(new Set(allTasks.flatMap(t => t.tags || []))).sort();

    // Filter tags that are NOT already in the task AND match input
    const filteredTags = existingTags.filter(tag =>
        !editedTask.tags?.includes(tag) &&
        tag.toLowerCase().includes(newTag.toLowerCase())
    );

    const addTag = (tagToAdd?: string) => {
        const tag = tagToAdd || newTag.trim();
        if (tag && !editedTask.tags?.includes(tag)) {
            const currentTags = editedTask.tags || [];
            updateField("tags", [...currentTags, tag]);
            setNewTag("");
            setShowTagSuggestions(false);
        }
    };

    const removeTag = (tagToRemove: string) => {
        const currentTags = editedTask.tags || [];
        updateField("tags", currentTags.filter(t => t !== tagToRemove));
    };

    const priorities = [
        { value: "high", label: "高", color: "text-red-500 bg-red-500/10 border-red-500/20" },
        { value: "medium", label: "中", color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
        { value: "low", label: "低", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    ];

    const inputClasses = cn(
        "w-full px-4 py-3 rounded-xl outline-none transition-all duration-200",
        theme === "dark"
            ? "bg-white/5 border border-white/10 focus:border-blue-500/50 focus:bg-white/10 text-white placeholder-white/20"
            : "bg-gray-50 border border-gray-200 focus:border-blue-500/50 focus:bg-white text-gray-900 placeholder-gray-400"
    );

    const labelClasses = cn(
        "flex items-center gap-2 text-sm font-semibold mb-3",
        theme === "dark" ? "text-gray-400" : "text-gray-500"
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={cn(
                "w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-all",
                theme === "dark" ? "bg-[#181825] border border-white/10" : "bg-white"
            )}>
                {/* Header */}
                <div className={cn(
                    "p-6 border-b flex justify-between items-start gap-4",
                    theme === "dark" ? "border-white/5 bg-white/5" : "border-gray-100 bg-gray-50/50"
                )}>
                    <input
                        value={editedTask.text}
                        onChange={(e) => updateField("text", e.target.value)}
                        className={cn(
                            "text-2xl font-bold bg-transparent border-none outline-none w-full placeholder-opacity-50",
                            theme === "dark" ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-300"
                        )}
                        placeholder={t("task.placeholder")}
                    />
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

                <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 custom-scrollbar">

                    {/* Priority Row */}
                    <div className="space-y-1">
                        <label className={labelClasses}>
                            <Flag size={16} /> {t("task.priority.label")}
                        </label>
                        <div className="flex gap-3">
                            {priorities.map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => updateField("priority", p.value)}
                                    className={cn(
                                        "flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all duration-200",
                                        editedTask.priority === p.value
                                            ? `ring-2 ring-offset-2 ring-offset-transparent ${p.color} border-transparent ring-current`
                                            : cn(
                                                "border-transparent opacity-60 hover:opacity-100",
                                                theme === "dark" ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
                                            )
                                    )}
                                >
                                    {t(`task.priority.${p.value}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notification Settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className={labelClasses}>
                                <Bell size={16} /> {t("notification.title")}
                            </label>
                            <select
                                value={notificationOffset === undefined ? "auto" : notificationOffset === -1 ? "off" : notificationOffset}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "auto") setNotificationOffset(undefined);
                                    else if (val === "off") setNotificationOffset(-1);
                                    else setNotificationOffset(Number(val));
                                }}
                                className={cn(inputClasses, "cursor-pointer appearance-none")}
                            >
                                <option value="auto" className={theme === "dark" ? "bg-[#181825] text-white" : "bg-white text-gray-900"}>{t("notification.auto")}</option>
                                <option value="off" className={theme === "dark" ? "bg-[#181825] text-white" : "bg-white text-gray-900"}>{t("notification.off")}</option>
                                <option value="5" className={theme === "dark" ? "bg-[#181825] text-white" : "bg-white text-gray-900"}>{t("notification.min5")}</option>
                                <option value="15" className={theme === "dark" ? "bg-[#181825] text-white" : "bg-white text-gray-900"}>{t("notification.min15")}</option>
                                <option value="30" className={theme === "dark" ? "bg-[#181825] text-white" : "bg-white text-gray-900"}>{t("notification.min30")}</option>
                                <option value="60" className={theme === "dark" ? "bg-[#181825] text-white" : "bg-white text-gray-900"}>{t("notification.hour1")}</option>
                                <option value="1440" className={theme === "dark" ? "bg-[#181825] text-white" : "bg-white text-gray-900"}>{t("notification.day1")}</option>
                            </select>
                        </div>

                        {/* Recurrence Settings */}
                        <div className="space-y-1">
                            <label className={labelClasses}>
                                <Repeat size={16} /> {t("recurrence.label")}
                            </label>
                            <select
                                value={recurrenceFreq}
                                onChange={(e) => setRecurrenceFreq(e.target.value as any)}
                                className={cn(inputClasses, "cursor-pointer appearance-none")}
                            >
                                <option value="none" className={theme === "dark" ? "bg-[#181825] text-white" : "bg-white text-gray-900"}>{t("recurrence.none")}</option>
                                <option value="daily" className={theme === "dark" ? "bg-[#181825] text-white" : "bg-white text-gray-900"}>{t("recurrence.daily")}</option>
                                <option value="weekly" className={theme === "dark" ? "bg-[#181825] text-white" : "bg-white text-gray-900"}>{t("recurrence.weekly")}</option>
                                <option value="monthly" className={theme === "dark" ? "bg-[#181825] text-white" : "bg-white text-gray-900"}>{t("recurrence.monthly")}</option>
                            </select>
                        </div>
                    </div>

                    {recurrenceFreq !== "none" && (
                        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                            {/* Interval */}
                            <div className="flex items-center gap-4">
                                <span className="text-sm opacity-60 w-16">{t("recurrence.interval")}</span>
                                <input
                                    type="number"
                                    min="1"
                                    value={recurrenceInterval}
                                    onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                                    className={cn(inputClasses, "w-24 px-2 py-1")}
                                />
                            </div>

                            {/* Weekly Days */}
                            {recurrenceFreq === "weekly" && (
                                <div className="space-y-2">
                                    <span className="text-sm opacity-60 block">{t("recurrence.days")}</span>
                                    <div className="flex gap-2 flex-wrap">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                            <button
                                                key={day}
                                                onClick={() => {
                                                    setRecurrenceWeekDays(prev =>
                                                        prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
                                                    )
                                                }}
                                                className={cn(
                                                    "w-10 h-10 rounded-full text-xs font-bold transition-all",
                                                    recurrenceWeekDays.includes(idx)
                                                        ? "bg-blue-500 text-white"
                                                        : "bg-white/5 hover:bg-white/10 text-white/50"
                                                )}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Monthly Days */}
                            {recurrenceFreq === "monthly" && (
                                <div className="space-y-2">
                                    <span className="text-sm opacity-60 block">{t("task.dueDate")}</span>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="number"
                                            min="1" max="31"
                                            value={recurrenceMonthDays[0] || 1}
                                            onChange={(e) => setRecurrenceMonthDays([Number(e.target.value)])}
                                            className={cn(inputClasses, "w-24 px-2 py-1")}
                                        />
                                        <span className="text-sm opacity-50">{t("recurrence.monthly")}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Due Date Row (Split Date/Time) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className={labelClasses}>
                                <Calendar size={16} /> {t("task.dueDate")}
                            </label>
                            <input
                                type="date"
                                value={datePart}
                                onChange={(e) => setDatePart(e.target.value)}
                                className={cn(
                                    inputClasses,
                                    !datePart && "text-opacity-50"
                                )}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClasses}>
                                <Clock size={16} /> {t("task.time")}
                            </label>
                            <input
                                type="time"
                                value={timePart}
                                onChange={(e) => setTimePart(e.target.value)}
                                className={cn(
                                    inputClasses,
                                    !timePart && "text-opacity-50"
                                )}
                            />
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-1">
                        <label className={labelClasses}>
                            <Tag size={16} /> {t("task.tags.label")}
                        </label>
                        <div className="bg-transparent space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {(editedTask.tags || []).map(tag => (
                                    <span key={tag} className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors group",
                                        theme === "dark"
                                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                            : "bg-blue-50 text-blue-600 border border-blue-100"
                                    )}>
                                        {tag}
                                        <button
                                            onClick={() => removeTag(tag)}
                                            className="opacity-50 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="relative group">
                                <input
                                    value={newTag}
                                    onChange={(e) => {
                                        setNewTag(e.target.value);
                                        setShowTagSuggestions(true);
                                    }}
                                    onFocus={() => setShowTagSuggestions(true)}
                                    // Delay blur to allow clicking suggestions
                                    onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addTag();
                                        }
                                    }}
                                    placeholder={t("task.tags.placeholder")}
                                    className={cn(inputClasses, "pr-12")}
                                />
                                <button
                                    onClick={() => addTag()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-blue-500 text-white opacity-0 group-focus-within:opacity-100 hover:bg-blue-600 transition-all font-medium text-xs"
                                    disabled={!newTag.trim()}
                                    title={t("task.tags.add")}
                                >
                                    {t("task.tags.add")}
                                </button>

                                {/* Tag Suggestions Dropdown */}
                                {showTagSuggestions && filteredTags.length > 0 && (
                                    <div className={cn(
                                        "absolute top-full left-0 w-full mt-2 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 max-h-48 overflow-y-auto custom-scrollbar border",
                                        theme === "dark" ? "bg-[#1f1f33] border-white/10" : "bg-white border-gray-100"
                                    )}>
                                        {filteredTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => addTag(tag)}
                                                className={cn(
                                                    "w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2",
                                                    theme === "dark"
                                                        ? "hover:bg-white/10 text-gray-300 hover:text-white"
                                                        : "hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                                                )}
                                            >
                                                <Tag size={12} className="opacity-50" />
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                        <label className={labelClasses}>
                            <AlignLeft size={16} /> {t("task.notes.label")}
                        </label>
                        <textarea
                            value={editedTask.notes || ""}
                            onChange={(e) => updateField("notes", e.target.value)}
                            placeholder={t("task.notes.placeholder")}
                            className={cn(inputClasses, "min-h-[120px] resize-y leading-relaxed")}
                        />
                    </div>

                    {/* Attachments */}
                    <div className="space-y-2">
                        <label className={labelClasses}>
                            <Paperclip size={16} /> {t("task.attachments.label", "添付ファイル")}
                        </label>
                        <div className="space-y-2">
                            {(editedTask.attachments || []).map((path, index) => (
                                <div key={index} className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border text-sm group",
                                    theme === "dark"
                                        ? "bg-white/5 border-white/10 text-gray-300"
                                        : "bg-gray-50 border-gray-100 text-gray-700"
                                )}>
                                    <span className="truncate flex-1 mr-4 font-mono text-xs">{path}</span>
                                    <button
                                        onClick={() => {
                                            const newAttachments = [...(editedTask.attachments || [])];
                                            newAttachments.splice(index, 1);
                                            updateField("attachments", newAttachments);
                                        }}
                                        className="text-red-400 opacity-60 hover:opacity-100 transition-opacity p-1"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={async () => {
                                    try {
                                        const selected = await open({
                                            multiple: true,
                                            title: t("task.attachments.add", "ファイルを選択")
                                        });
                                        if (selected) {
                                            const paths = Array.isArray(selected) ? selected : [selected];
                                            // Since file paths are strings in current tauri-plugin-dialog (v2), we map them directly?
                                            // Actually v2 dialog returns FileResponse objects or strings? 
                                            // Usually string[] if multiple=true without directory=true?
                                            // The type definition says `null | string | string[]`.
                                            // Let's assume path strings.
                                            const newStats = [...(editedTask.attachments || [])];
                                            // Filter out duplicates
                                            paths.forEach(p => {
                                                if (typeof p === 'string' && !newStats.includes(p)) {
                                                    newStats.push(p);
                                                }
                                            });
                                            updateField("attachments", newStats);
                                        }
                                    } catch (err) {
                                        console.error("Failed to open dialog", err);
                                    }
                                }}
                                className={cn(
                                    "w-full py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium transition-all",
                                    theme === "dark"
                                        ? "border-white/10 hover:border-blue-500/50 hover:bg-white/5 text-gray-400 hover:text-blue-400"
                                        : "border-gray-200 hover:border-blue-500/50 hover:bg-gray-50 text-gray-500 hover:text-blue-500"
                                )}
                            >
                                <Paperclip size={16} />
                                {t("task.attachments.add", "ファイルを追加")}
                            </button>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className={cn(
                    "p-6 border-t flex justify-end gap-3",
                    theme === "dark" ? "border-white/5 bg-white/5" : "border-gray-100 bg-gray-50/50"
                )}>
                    <button
                        onClick={onClose}
                        className={cn(
                            "px-6 py-2.5 rounded-xl font-semibold transition-colors",
                            theme === "dark" ? "hover:bg-white/10 text-white/70 hover:text-white" : "hover:bg-gray-200 text-gray-600 hover:text-gray-900"
                        )}
                    >
                        {t("task.actions.cancel")}
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-8 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
                    >
                        {t("task.actions.save")}
                    </button>
                </div>
            </div>
        </div>
    );
}
