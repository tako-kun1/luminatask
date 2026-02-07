import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { Moon, Sun, Settings, Maximize2, Menu, ChevronDown, ChevronRight } from "lucide-react";
import { check } from "@tauri-apps/plugin-updater";
import { ask, message } from "@tauri-apps/plugin-dialog"; // UX Fix: Native Dialog
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskInput } from "./components/TaskInput";
import { TaskItem } from "./components/TaskItem";
import { SettingsModal } from "./components/SettingsModal";
import { FocusMode } from "./components/FocusMode";
import { TaskDetailModal } from "./components/TaskDetailModal";
import { HelpModal } from "./components/HelpModal";
import { Task, Project } from "./types";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { cn } from "./utils";
import { useTranslation } from "react-i18next";
import { useTaskScheduler } from "./hooks/useTaskScheduler";
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";
import { ContextMenu } from "./components/ContextMenu";
import { ReleaseNotesModal } from "./components/ReleaseNotesModal";
import { Sidebar } from "./components/Sidebar";
import { ProjectModal } from "./components/ProjectModal";
import { StatsModal } from "./components/StatsModal";

// Sortable Item Component Wrapper
function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : "auto",
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

function AppContent() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notification, setNotification] = useState<{ title: string; body: string } | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<{ version: string; notes: string } | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Scheduler Hook (Deadline Notification & Promotion)
  useTaskScheduler({
    tasks,
    onReorder: setTasks,
    onNotification: setNotification
  });
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; task: Task } | null>(null);
  const { theme, isAuto, toggleTheme } = useTheme();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpMode, setHelpMode] = useState<"default" | "welcome">("default");

  // Check for updates
  const checkForUpdates = async (silent: boolean = true) => {
    try {
      const update = await check();
      if (update?.available) {
        const yes = await ask(
          `新しいバージョン ${update.version} が利用可能です。\n\n${update.body}`,
          {
            title: "Lumina Task Update",
            kind: "info",
            okLabel: "ダウンロードページを開く",
            cancelLabel: "後で"
          }
        );
        if (yes) {
          // Redirect to GitHub Releases page
          await openUrl(`https://github.com/tako-kun1/luminatask/releases/tag/v${update.version}`);
        }
      } else if (!silent) {
        await message("お使いのバージョンは最新です。", {
          title: "アップデートの確認",
          kind: "info",
          okLabel: "OK"
        });
      }
    } catch (error) {
      console.error("Update check failed", error);
      if (!silent) {
        await message(`アップデートの確認に失敗しました。\n${error}`, {
          title: "エラー",
          kind: "error"
        });
      }
    }
  };

  // Initial check & Interval check
  useEffect(() => {
    checkForUpdates(true); // Initial check (silent)

    // Check every 3 hours (3 * 60 * 60 * 1000 ms)
    const intervalId = setInterval(() => {
      checkForUpdates(true);
    }, 10800000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Check for first launch
    const tutorialSeen = localStorage.getItem("lumina_tutorial_seen");
    if (!tutorialSeen) {
      setIsHelpOpen(true);
      setHelpMode("welcome");
      localStorage.setItem("lumina_tutorial_seen", "true");
    }

    // Check for pending release notes (after update)
    const pendingNotes = localStorage.getItem("lumina_pending_release_notes");
    const pendingVersion = localStorage.getItem("lumina_pending_update_version");
    if (pendingNotes && pendingVersion) {
      setReleaseNotes({ version: pendingVersion, notes: pendingNotes });
      localStorage.removeItem("lumina_pending_release_notes");
      localStorage.removeItem("lumina_pending_update_version");
    }

    // Global Keyboard Shortcuts
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        setHelpMode("default");
        setIsHelpOpen(true);
      }
      if (e.key === "F11") {
        e.preventDefault();
        setIsFocusModeOpen((prev) => !prev);
      }
    };
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("contextmenu", handleContextMenu);


    // Request notification permission
    const initNotifications = async () => {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === "granted";
      }
    };
    initNotifications();

    invoke<Task[]>("get_tasks")
      .then(setTasks)
      .catch((e) => {
        console.error("Failed to load tasks", e);
      });

    invoke<Project[]>("get_projects")
      .then(setProjects)
      .catch((e) => console.error("Failed to load projects", e));


    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  const addTask = async (text: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: Date.now(),
      projectId: selectedProjectId || undefined,
    };

    try {
      const updated = await invoke<Task[]>("add_task", { task: newTask });
      setTasks(updated);
    } catch (e) {
      console.error("Failed to add task", e);
    }
  };

  const toggleTask = async (id: string) => {
    try {
      const updated = await invoke<Task[]>("toggle_task", { id });
      setTasks(updated);
    } catch (e) {
      console.error("Failed to toggle task", e);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const updated = await invoke<Task[]>("delete_task", { id });
      setTasks(updated);
    } catch (e) {
      console.error("Failed to delete task", e);
    }
  };

  const updateTask = async (updatedTask: Task) => {
    try {
      const result = await invoke<Task[]>("update_task", { updatedTask });
      setTasks(result);
    } catch (e) {
      console.error("Failed to update task", e);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newTasks = arrayMove(tasks, oldIndex, newIndex);
      setTasks(newTasks);
      try {
        await invoke("update_tasks_order", { newTasks });
      } catch (e) {
        console.error("Failed to update order", e);
      }
    }
  };

  const moveToTop = async (taskId: string) => {
    const oldIndex = tasks.findIndex((t) => t.id === taskId);
    if (oldIndex !== -1 && oldIndex !== 0) {
      const newTasks = arrayMove(tasks, oldIndex, 0);
      setTasks(newTasks);
      try {
        await invoke("update_tasks_order", { newTasks });
      } catch (e) {
        console.error("Failed to update order", e);
      }
    }
  };

  const handleReorder = async (newTasks: Task[]) => {
    setTasks(newTasks);
    try {
      await invoke("update_tasks_order", { newTasks });
    } catch (e) {
      console.error("Failed to update order", e);
    }
  };

  const createProject = async (name: string, color: string, icon: string) => {
    try {
      const newProject: Project = { id: crypto.randomUUID(), name, color, icon };
      const updated = await invoke<Project[]>("create_project", { project: newProject });
      setProjects(updated);
    } catch (e) {
      console.error("Failed to create project", e);
    }
  };

  const deleteProject = async (id: string) => {
    // UX Fix: Use native async dialog to prevent UI glitches/race conditions
    const confirmed = await ask(t("task.deleteConfirm"), {
      title: t("app.title"),
      kind: "warning",
    });
    if (!confirmed) return;

    try {
      const updated = await invoke<Project[]>("delete_project", { id });
      setProjects(updated);
      if (selectedProjectId === id) setSelectedProjectId(null);

      // Stats Fix: Refresh tasks state because backend cascaded delete
      const updatedTasks = await invoke<Task[]>("get_tasks");
      setTasks(updatedTasks);
    } catch (e) {
      console.error("Failed to delete project", e);
    }
  };

  // Filter tasks based on selection
  const filteredTasks = tasks.filter(t => {
    // If selectedProjectId is null (Inbox), show tasks with NO project_id
    if (selectedProjectId === null) return !t.projectId;
    return t.projectId === selectedProjectId;
  });

  const activeTasks = filteredTasks.filter(t => !t.completed);
  const completedTasks = filteredTasks.filter(t => t.completed);

  const handleContextMenu = (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      task
    });
  };

  // Keyboard Navigation Hook
  const { focusedTaskId } = useKeyboardNavigation({
    tasks: filteredTasks, // Use filtered tasks for navigation
    onToggle: toggleTask,
    onEdit: (task) => setEditingTask(task),
    onDelete: (id) => {
      if (confirm(t("task.deleteConfirm"))) {
        deleteTask(id);
      }
    }
  });

  return (
    <main className={cn(
      "min-h-screen font-sans transition-colors duration-300 overflow-hidden flex",
      theme === "dark"
        ? "bg-gradient-to-br from-[#1a1c2c] via-[#4a192c] to-[#1f1f33] text-white"
        : "bg-gray-50 text-gray-900"
    )}>
      <Sidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        onCreateProject={() => setIsProjectModalOpen(true)}
        onDeleteProject={deleteProject}
        onOpenStats={() => setIsStatsOpen(true)}
        isOpen={isSidebarOpen}
        theme={theme}
      />
      <div className={cn(
        "flex-1 p-8 overflow-y-auto h-screen custom-scrollbar transition-all duration-300 relative",
        isSidebarOpen ? "ml-64" : "ml-0"
      )}>
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              "p-2 rounded-full transition-all duration-300 opacity-60 hover:opacity-100",
              theme === "dark" ? "hover:bg-white/10 text-white" : "hover:bg-gray-200 text-gray-900"
            )}
            aria-label="Toggle Sidebar"
          >
            <Menu size={24} />
          </button>
        </div>
        <div className="max-w-xl mx-auto mt-10">
          <header className="mb-8 grid grid-cols-[1fr_auto_1fr] items-center">
            <div className="flex gap-2 justify-start">

              <button
                onClick={() => setIsSettingsOpen(true)}
                className={cn(
                  "p-2 rounded-full transition-all duration-300 opacity-60 hover:opacity-100",
                  theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-200"
                )}
                aria-label="Settings"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={() => setIsFocusModeOpen(true)}
                className={cn(
                  "p-2 rounded-full transition-all duration-300 opacity-60 hover:opacity-100",
                  theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-200"
                )}
                aria-label="Focus Mode"
              >
                <Maximize2 size={20} />
              </button>
            </div>

            <div className="text-center">
              <h1 className={cn(
                "text-4xl font-bold bg-clip-text text-transparent drop-shadow-sm",
                theme === "dark"
                  ? "bg-gradient-to-r from-blue-300 to-purple-300"
                  : "bg-gradient-to-r from-blue-600 to-purple-600"
              )}>
                Lumina Task
              </h1>
              <p className={theme === "dark" ? "text-white/40" : "text-gray-500"}>
                {t("app.slogan")}
              </p>
            </div>

            <div className="flex justify-end">
              {!isAuto && (
                <button
                  onClick={toggleTheme}
                  className={cn(
                    "p-2 rounded-full transition-all duration-300",
                    theme === "dark"
                      ? "bg-white/10 hover:bg-white/20 text-yellow-300"
                      : "bg-gray-200 hover:bg-gray-300 text-orange-500"
                  )}
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? <Sun size={24} /> : <Moon size={24} />}
                </button>
              )}
            </div>
          </header>

          <TaskInput onAdd={addTask} theme={theme} />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >

            <SortableContext
              items={activeTasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {activeTasks.map((task) => (
                  <SortableItem key={task.id} id={task.id}>
                    <TaskItem
                      task={task}
                      onToggle={toggleTask}
                      onDelete={deleteTask}
                      onClick={() => setEditingTask(task)}
                      onContextMenu={handleContextMenu}
                      theme={theme}
                      isFocused={focusedTaskId === task.id}
                    />
                  </SortableItem>
                ))}
                {activeTasks.length === 0 && completedTasks.length === 0 && (
                  <div className={cn(
                    "text-center py-10",
                    theme === "dark" ? "text-white/20" : "text-gray-400"
                  )}>
                    {t("app.emptyTasks")}
                  </div>
                )}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeId ? (
                <div className="opacity-80 scale-105">
                  {(() => {
                    const task = tasks.find(t => t.id === activeId);
                    return task ? (
                      <TaskItem
                        task={task}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        theme={theme}
                      />
                    ) : null;
                  })()}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Completed Tasks Section */}
          {completedTasks.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setIsCompletedOpen(!isCompletedOpen)}
                className={cn(
                  "flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-4 transition-colors",
                  theme === "dark" ? "text-white/40 hover:text-white/60" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {isCompletedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {t("task.completedList")} ({completedTasks.length})
              </button>

              {isCompletedOpen && (
                <div className="space-y-3 opacity-60">
                  {completedTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={toggleTask}
                      onDelete={deleteTask}
                      onClick={() => setEditingTask(task)}
                      onContextMenu={handleContextMenu}
                      theme={theme}
                      isFocused={focusedTaskId === task.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {theme === "dark" && (
          <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[100px]" />
          </div>
        )}

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onCheckUpdates={() => checkForUpdates(false)}
        />
        <FocusMode
          isOpen={isFocusModeOpen}
          onClose={() => setIsFocusModeOpen(false)}
          tasks={filteredTasks}
          theme={theme}
          onToggle={toggleTask}
          onMoveToTop={moveToTop}
          onReorder={handleReorder}
          notification={notification}
        />
        <TaskDetailModal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          task={editingTask}
          onUpdate={updateTask}
          theme={theme}
          allTasks={tasks}
          projects={projects}
        />
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            task={contextMenu.task}
            onClose={() => setContextMenu(null)}
            onEdit={() => setEditingTask(contextMenu.task)}
            onDelete={() => deleteTask(contextMenu.task.id)}
            onToggle={() => toggleTask(contextMenu.task.id)}
            theme={theme}
          />
        )}
        <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} mode={helpMode} />
        <ReleaseNotesModal
          isOpen={!!releaseNotes}
          onClose={() => setReleaseNotes(null)}
          version={releaseNotes?.version || ""}
          notes={releaseNotes?.notes || ""}
        />
      </div>{/* End of flex-1 main content */}

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onCreate={createProject}
        theme={theme}
      />
      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        tasks={tasks}
        projects={projects}
        theme={theme}
      />
    </main>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
