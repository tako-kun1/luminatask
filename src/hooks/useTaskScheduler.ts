import { useEffect, useRef } from "react";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { Task } from "../types";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

interface NotificationContent {
    title: string;
    body: string;
}

interface UseTaskSchedulerProps {
    tasks: Task[];
    onReorder: (tasks: Task[]) => void;
    onNotification?: (content: NotificationContent) => void;
}

export function useTaskScheduler({ tasks, onReorder, onNotification }: UseTaskSchedulerProps) {
    const { t } = useTranslation();
    const notifiedTasks = useRef<Set<string>>(new Set());

    // Check permission on mount
    useEffect(() => {
        const checkPermission = async () => {
            let permission = await isPermissionGranted();
            if (!permission) {
                const permissionStatus = await requestPermission();
                permission = permissionStatus === "granted";
            }
        };
        checkPermission();
    }, []);

    useEffect(() => {
        const checkDeadlines = async () => {
            const now = Date.now();
            const incompleteTasks = tasks.filter(t => !t.completed);

            if (incompleteTasks.length === 0) return;

            let taskToPromote: Task | null = null;
            const hasOsPermission = await isPermissionGranted();

            incompleteTasks.forEach(task => {
                if (task.dueDate && !notifiedTasks.current.has(task.id)) {

                    // Determine Offset
                    let offsetMinutes = 30; // Default (Auto + Time)

                    if (task.notificationOffset !== undefined) {
                        if (task.notificationOffset === -1) return; // Notification OFF
                        offsetMinutes = task.notificationOffset;
                    } else if (task.includeTime === false) {
                        // Auto + Date Only -> 1 Day before
                        offsetMinutes = 1440;
                    }

                    const threshold = offsetMinutes * 60 * 1000;
                    const timeLeft = task.dueDate - now;

                    // Trigger window: within threshold, but not excessively late (e.g. < 2x threshold) to avoid old tasks
                    // For "1 day before", 2x threshold is 2 days, which makes sense.
                    if (timeLeft > 0 && timeLeft <= threshold) {
                        const title = t("scheduler.notification.title");
                        const body = t("scheduler.notification.body", {
                            name: task.text,
                            time: format(task.dueDate, "HH:mm")
                        });

                        // 1. OS Notification
                        if (hasOsPermission) {
                            sendNotification({ title, body });
                        }

                        // 2. In-App Notification (Callback)
                        if (onNotification) {
                            onNotification({ title, body });
                        }

                        notifiedTasks.current.add(task.id);

                        // Promote if it's the most urgent one in this batch
                        if (!taskToPromote || task.dueDate < taskToPromote.dueDate!) {
                            taskToPromote = task;
                        }
                    }
                }
            });

            if (taskToPromote) {
                const promoteTarget = taskToPromote as Task;
                const currentTop = incompleteTasks[0];
                if (currentTop.id !== promoteTarget.id) {
                    const otherTasks = tasks.filter(t => t.id !== promoteTarget.id);
                    onReorder([promoteTarget, ...otherTasks]);
                }
            }
        };

        // Check every 30 seconds
        const timer = setInterval(checkDeadlines, 30000);
        checkDeadlines();

        return () => clearInterval(timer);
    }, [tasks, onReorder, onNotification, t]);
}
