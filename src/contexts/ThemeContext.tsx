import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light";
export type LocationMode = "auto" | "manual";
export interface Coordinates {
    latitude: number;
    longitude: number;
}

interface ThemeContextType {
    theme: Theme;
    isAuto: boolean;
    toggleTheme: () => void;
    setAuto: (auto: boolean) => void;

    // Location Settings
    locationMode: LocationMode;
    setLocationMode: (mode: LocationMode) => void;
    manualCoordinates: Coordinates;
    setManualCoordinates: (coords: Coordinates) => void;

    // Display Settings
    showWeather: boolean;
    setShowWeather: (show: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [isAuto, setIsAutoState] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("theme_auto");
            return saved === "true"; // Default to false if not set
        }
        return false;
    });

    const [manualTheme, setManualTheme] = useState<Theme>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("theme") as Theme;
            if (saved) return saved;
            if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
        }
        return "dark";
    });

    const [theme, setTheme] = useState<Theme>(manualTheme);

    // Location State
    const [locationMode, setLocationModeState] = useState<LocationMode>(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("location_mode") as LocationMode) || "auto";
        }
        return "auto";
    });

    const [manualCoordinates, setManualCoordinatesState] = useState<Coordinates>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("manual_coordinates");
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch { }
            }
        }
        return { latitude: 35.6895, longitude: 139.6917 }; // Default to Tokyo
    });

    // Display Settings
    const [showWeather, setShowWeather] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("settings_show_weather");
            return saved !== "false"; // Default to true
        }
        return true;
    });

    // Effect to handle Auto Mode logic (Theme)
    useEffect(() => {
        if (!isAuto) {
            setTheme(manualTheme);
            return;
        }

        const checkTime = () => {
            const hour = new Date().getHours();
            // 6:00 - 18:00 is Light, otherwise Dark
            const shouldBeLight = hour >= 6 && hour < 18;
            setTheme(shouldBeLight ? "light" : "dark");
        };

        checkTime();
        const interval = setInterval(checkTime, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [isAuto, manualTheme]);

    // Persist Manual Theme
    useEffect(() => {
        if (!isAuto) {
            localStorage.setItem("theme", manualTheme);
        }
    }, [manualTheme, isAuto]);

    // Persist Auto Setting
    useEffect(() => {
        localStorage.setItem("theme_auto", String(isAuto));
    }, [isAuto]);

    // Persist Location Settings
    useEffect(() => {
        localStorage.setItem("location_mode", locationMode);
    }, [locationMode]);

    useEffect(() => {
        localStorage.setItem("manual_coordinates", JSON.stringify(manualCoordinates));
    }, [manualCoordinates]);

    // Persist Display Settings
    useEffect(() => {
        localStorage.setItem("settings_show_weather", String(showWeather));
    }, [showWeather]);

    // Apply theme to DOM
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
    }, [theme]);

    const toggleTheme = () => {
        if (isAuto) return; // Disable toggle in auto mode
        setManualTheme((prev) => (prev === "dark" ? "light" : "dark"));
    };

    const setAuto = (auto: boolean) => {
        setIsAutoState(auto);
    };

    const setLocationMode = (mode: LocationMode) => {
        setLocationModeState(mode);
    };

    const setManualCoordinates = (coords: Coordinates) => {
        setManualCoordinatesState(coords);
    };

    return (
        <ThemeContext.Provider value={{
            theme, isAuto, toggleTheme, setAuto,
            locationMode, setLocationMode, manualCoordinates, setManualCoordinates,
            showWeather, setShowWeather
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
