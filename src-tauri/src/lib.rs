use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub text: String,
    pub completed: bool,
    #[serde(rename = "createdAt")]
    pub created_at: match_types::Timestamp,
    #[serde(rename = "completedAt")]
    pub completed_at: Option<match_types::Timestamp>,

    // New fields
    #[serde(rename = "dueDate")]
    pub due_date: Option<match_types::Timestamp>,
    #[serde(default)]
    #[serde(rename = "includeTime")]
    pub include_time: bool,
    #[serde(rename = "notificationOffset")]
    pub notification_offset: Option<i64>, // minutes before due date

    pub priority: Option<String>, // "high", "medium", "low"
    #[serde(default)]
    pub tags: Vec<String>,
    pub notes: Option<String>,

    #[serde(rename = "recurrenceRule")]
    pub recurrence_rule: Option<RecurrenceRule>,

    #[serde(default)]
    pub attachments: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecurrenceRule {
    pub freq: String, // "daily", "weekly", "monthly"
    pub interval: u32,
    #[serde(rename = "weekDays")]
    pub week_days: Option<Vec<u32>>, // 0=Sun
    #[serde(rename = "monthDays")]
    pub month_days: Option<Vec<u32>>, // 1-31
}

// Simple alias to match JS Date.now()
mod match_types {
    pub type Timestamp = u64;
}

#[derive(Default)]
struct AppState {
    tasks: Mutex<Vec<Task>>,
    db_path: Mutex<PathBuf>,
    zip_map: Mutex<std::collections::HashMap<String, String>>,
}

const DB_FILENAME: &str = "tasks.json";

fn get_db_path(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("failed to get app data dir")
        .join(DB_FILENAME)
}

fn save_tasks(tasks: &[Task], path: &PathBuf) -> Result<(), String> {
    let json = serde_json::to_string_pretty(tasks).map_err(|e| e.to_string())?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_tasks(state: State<'_, AppState>) -> Result<Vec<Task>, String> {
    let tasks = state.tasks.lock().map_err(|_| "Failed to lock state")?;
    Ok(tasks.clone())
}

#[tauri::command]
fn add_task(task: Task, state: State<'_, AppState>) -> Result<Vec<Task>, String> {
    let mut tasks = state.tasks.lock().map_err(|_| "Failed to lock state")?;
    let path = state.db_path.lock().map_err(|_| "Failed to lock db path")?;

    tasks.insert(0, task); // Add to top
    save_tasks(&tasks, &path)?;

    Ok(tasks.clone())
}

#[tauri::command]
fn toggle_task(id: String, state: State<'_, AppState>) -> Result<Vec<Task>, String> {
    let mut tasks = state.tasks.lock().map_err(|_| "Failed to lock state")?;
    let path = state.db_path.lock().map_err(|_| "Failed to lock db path")?;

    let mut new_task_to_add: Option<Task> = None;

    if let Some(task) = tasks.iter_mut().find(|t| t.id == id) {
        task.completed = !task.completed;
        if task.completed {
            let start = std::time::SystemTime::now();
            let since_the_epoch = start
                .duration_since(std::time::UNIX_EPOCH)
                .expect("Time went backwards")
                .as_millis() as u64;
            task.completed_at = Some(since_the_epoch);

            // Handle Recurrence
            if let Some(rule) = &task.recurrence_rule {
                if let Some(due) = task.due_date {
                    use chrono::{Datelike, TimeZone};
                    let dt = chrono::Utc.timestamp_millis_opt(due as i64).unwrap();

                    let next_date = match rule.freq.as_str() {
                        "daily" => Some(dt + chrono::Duration::days(rule.interval as i64)),
                        "weekly" => Some(dt + chrono::Duration::weeks(rule.interval as i64)),
                        "monthly" => {
                            let mut year = dt.year();
                            let mut month = dt.month() + rule.interval;
                            while month > 12 {
                                month -= 12;
                                year += 1;
                            }
                            let day = std::cmp::min(dt.day(), get_days_in_month(year, month));
                            dt.with_year(year)
                                .and_then(|d| d.with_month(month))
                                .and_then(|d| d.with_day(day))
                        }
                        _ => None,
                    };

                    if let Some(next) = next_date {
                        let mut new_task = task.clone();
                        new_task.id = uuid::Uuid::new_v4().to_string();
                        // Reset status
                        new_task.completed = false;
                        new_task.completed_at = None;
                        new_task.created_at = since_the_epoch;
                        new_task.due_date = Some(next.timestamp_millis() as u64);

                        // We will add this task after the mutable borrow ends
                        new_task_to_add = Some(new_task);
                    }
                }
            }
        } else {
            task.completed_at = None;
        }
    }

    if let Some(new_task) = new_task_to_add {
        tasks.push(new_task);
    }

    save_tasks(&tasks, &path)?;

    Ok(tasks.clone())
}

fn get_days_in_month(year: i32, month: u32) -> u32 {
    use chrono::Datelike;
    chrono::NaiveDate::from_ymd_opt(year, month + 1, 1)
        .unwrap_or_else(|| chrono::NaiveDate::from_ymd_opt(year + 1, 1, 1).unwrap())
        .pred_opt()
        .unwrap()
        .day()
}

#[tauri::command]
fn update_task(updated_task: Task, state: State<'_, AppState>) -> Result<Vec<Task>, String> {
    let mut tasks = state.tasks.lock().map_err(|_| "Failed to lock state")?;
    let path = state.db_path.lock().map_err(|_| "Failed to lock db path")?;

    if let Some(index) = tasks.iter().position(|t| t.id == updated_task.id) {
        tasks[index] = updated_task;
        save_tasks(&tasks, &path)?;
    }

    Ok(tasks.clone())
}

#[tauri::command]
fn delete_task(id: String, state: State<'_, AppState>) -> Result<Vec<Task>, String> {
    let mut tasks = state.tasks.lock().map_err(|_| "Failed to lock state")?;
    let path = state.db_path.lock().map_err(|_| "Failed to lock db path")?;

    tasks.retain(|t| t.id != id);
    save_tasks(&tasks, &path)?;

    Ok(tasks.clone())
}

#[tauri::command]
fn update_tasks_order(
    new_tasks: Vec<Task>,
    state: State<'_, AppState>,
) -> Result<Vec<Task>, String> {
    let mut tasks = state.tasks.lock().map_err(|_| "Failed to lock state")?;
    let path = state.db_path.lock().map_err(|_| "Failed to lock db path")?;

    *tasks = new_tasks;
    save_tasks(&tasks, &path)?;

    Ok(tasks.clone())
}

#[tauri::command]
async fn reset_app(state: State<'_, AppState>) -> Result<Vec<Task>, String> {
    let mut tasks = state.tasks.lock().map_err(|_| "Failed to lock state")?;
    let path = state.db_path.lock().map_err(|_| "Failed to lock db path")?;

    tasks.clear();
    save_tasks(&tasks, &path)?;

    Ok(tasks.clone())
}

#[derive(serde::Deserialize)]
struct ZipCloudResult {
    address1: String,
    address2: String,
    address3: String,
}

#[derive(serde::Deserialize)]
struct ZipCloudResponse {
    results: Option<Vec<ZipCloudResult>>,
    status: i32,
    message: Option<String>,
}

#[tauri::command]
async fn get_address_from_zip(zipcode: String) -> Result<String, String> {
    let url = format!(
        "https://zipcloud.ibsnet.co.jp/api/search?zipcode={}",
        zipcode
    );
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Network error: {}", e))?
        .json::<ZipCloudResponse>()
        .await
        .map_err(|e| format!("Json parse error: {}", e))?;

    if resp.status != 200 {
        return Err(resp
            .message
            .unwrap_or_else(|| "Unknown API error".to_string()));
    }

    if let Some(results) = resp.results {
        if let Some(first) = results.first() {
            return Ok(format!(
                "{}{}{}",
                first.address1, first.address2, first.address3
            ));
        }
    }

    Err("No address found".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_geolocation::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .setup(|app| {
            let handle = app.handle();
            let db_path = get_db_path(handle);

            // Load existing tasks
            let mut initial_tasks = Vec::new();
            if db_path.exists() {
                if let Ok(content) = fs::read_to_string(&db_path) {
                    if let Ok(loaded) = serde_json::from_str::<Vec<Task>>(&content) {
                        initial_tasks = loaded;
                    }
                }
            }

            // Load Zip Data from embedded CSV
            // Format: ColIndex 2=Zip, 6=Pref, 7=City, 8=Town
            let mut zip_map = std::collections::HashMap::new();
            let csv_data = include_str!("../utf_ken_all.csv");
            let mut rdr = csv::ReaderBuilder::new()
                .has_headers(false)
                .from_reader(csv_data.as_bytes());

            for result in rdr.records() {
                if let Ok(record) = result {
                    if record.len() >= 9 {
                        let zip = record.get(2).unwrap_or("").to_string();
                        let pref = record.get(6).unwrap_or("").to_string();
                        let city = record.get(7).unwrap_or("").to_string();

                        // User requested to use only up to City level for better geocoding hits
                        // Open-Meteo works better with "Prefecture + City" than specific town names
                        let addr_city_level = format!("{}{}", pref, city);

                        zip_map.insert(zip, addr_city_level);
                    }
                }
            }

            let state = app.state::<AppState>();

            {
                let mut tasks_lock = state.tasks.lock().unwrap();
                *tasks_lock = initial_tasks;
            }

            {
                let mut path_lock = state.db_path.lock().unwrap();
                *path_lock = db_path;
            }

            {
                let mut map_lock = state.zip_map.lock().unwrap();
                *map_lock = zip_map;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_tasks,
            add_task,
            toggle_task,
            update_task,
            delete_task,
            update_tasks_order,
            reset_app,
            get_address_from_zip
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
