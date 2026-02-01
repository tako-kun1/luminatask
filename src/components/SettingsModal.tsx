import { X, Settings as SettingsIcon, Navigation, Languages, Cloud, Search, Loader2, AlertTriangle } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { cn } from "../utils";
import { getCurrentPosition } from "@tauri-apps/plugin-geolocation";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const {
        theme, isAuto, setAuto,
        locationMode, setLocationMode, manualCoordinates, setManualCoordinates,
        showWeather, setShowWeather
    } = useTheme();
    const { t, i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLang = i18n.language === "ja" ? "en" : "ja";
        i18n.changeLanguage(newLang);
    };

    const [isLoadingLoc, setIsLoadingLoc] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchResults([]);

        try {
            let query = searchQuery.trim();
            const lang = i18n.language === "ja" ? "ja" : "en";

            // Check for Japanese Postal Code (e.g., 100-0001 or 1000001)
            const zipCodeRegex = /^\d{3}-?\d{4}$/;
            if (zipCodeRegex.test(query)) {
                try {
                    const zipRes = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${query.replace("-", "")}`);
                    const zipData = await zipRes.json();

                    if (zipData.results && zipData.results.length > 0) {
                        const result = zipData.results[0];
                        // Construct address string (Prefecture + City + Town)
                        query = `${result.address1}${result.address2}${result.address3}`;
                    }
                } catch (e) {
                    console.warn("Zip code lookup failed, falling back to direct search", e);
                }
            }

            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=${lang}&format=json`);
            const data = await res.json();
            if (data.results) {
                setSearchResults(data.results);
            } else if (zipCodeRegex.test(searchQuery) && data.results === undefined) {
                // Return empty if zip found but no geo (rare) or handle error
            }
        } catch (e) {
            console.error("Search failed", e);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectLocation = (result: any) => {
        setManualCoordinates({
            latitude: result.latitude,
            longitude: result.longitude
        });
        setSearchResults([]);
        setSearchQuery(""); // Optional: keep query or clear? Clearing feels like "done".
    };

    const handleGetCurrentLocation = async () => {
        setIsLoadingLoc(true);
        try {
            const pos = await getCurrentPosition();
            if (pos) {
                setManualCoordinates({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                });
            }
        } catch (e) {
            console.error("Failed to get location", e);
        } finally {
            setIsLoadingLoc(false);
        }
    };

    const handleReset = async () => {
        if (window.confirm(t("settings.resetConfirmDesc"))) {
            try {
                localStorage.clear();
                await invoke("reset_app");
                window.location.reload();
            } catch (e) {
                console.error("Failed to reset app", e);
            }
        }
    };

    if (!isOpen) return null;

    const inputClasses = cn(
        "w-full px-3 py-2 rounded-lg text-sm border outline-none transition-all",
        theme === "dark"
            ? "bg-black/20 border-white/10 focus:border-blue-500/50 text-white"
            : "bg-white border-gray-200 focus:border-blue-500 text-gray-900"
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className={cn(
                "relative w-full max-w-md p-6 rounded-2xl shadow-2xl transform transition-all max-h-[90vh] overflow-y-auto custom-scrollbar",
                theme === "dark"
                    ? "bg-[#1a1c2c] border border-white/10 text-white"
                    : "bg-white border border-gray-100 text-gray-900"
            )}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <SettingsIcon size={20} />
                        {t("settings.title")}
                    </h2>
                    <button
                        onClick={onClose}
                        className={cn(
                            "p-1 rounded-lg transition-colors",
                            theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100"
                        )}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-8">
                    {/* Language Settings */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b pb-2 border-dashed border-gray-500/30 flex items-center gap-2">
                            <Languages size={18} /> {t("settings.language.title")}
                        </h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium mb-1">{t("settings.language.label")}</h3>
                                <p className="text-xs opacity-70">
                                    {i18n.language === "ja" ? "日本語" : "English"}
                                </p>
                            </div>
                            <button
                                onClick={toggleLanguage}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors",
                                    theme === "dark" ? "bg-white/10 border-white/10 hover:bg-white/20" : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                                )}
                            >
                                {i18n.language === "ja" ? "EN" : "JA"}
                            </button>
                        </div>
                    </div>

                    {/* Theme Settings */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b pb-2 border-dashed border-gray-500/30">{t("settings.theme.title")}</h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium mb-1">{t("settings.theme.auto")}</h3>
                                <p className={cn(
                                    "text-xs opacity-70",
                                )}>
                                    {t("settings.theme.desc")}
                                </p>
                            </div>

                            <button
                                onClick={() => setAuto(!isAuto)}
                                className={cn(
                                    "relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                                    isAuto
                                        ? "bg-blue-500"
                                        : theme === "dark" ? "bg-white/20" : "bg-gray-200"
                                )}
                            >
                                <span
                                    className={cn(
                                        "absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300",
                                        isAuto ? "translate-x-6" : "translate-x-0"
                                    )}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Location Settings */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b pb-2 border-dashed border-gray-500/30 flex items-center gap-2">
                            {t("settings.location.title")}
                        </h3>

                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium mb-1">{t("settings.location.manual")}</h3>
                                <p className="text-xs opacity-70">
                                    {t("settings.location.manualDesc")}
                                </p>
                            </div>
                            <button
                                onClick={() => setLocationMode(locationMode === "auto" ? "manual" : "auto")}
                                className={cn(
                                    "relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                                    locationMode === "manual"
                                        ? "bg-blue-500"
                                        : theme === "dark" ? "bg-white/20" : "bg-gray-200"
                                )}
                            >
                                <span
                                    className={cn(
                                        "absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300",
                                        locationMode === "manual" ? "translate-x-6" : "translate-x-0"
                                    )}
                                />
                            </button>
                        </div>

                        {locationMode === "manual" && (
                            <div className={cn(
                                "p-4 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2",
                                theme === "dark" ? "bg-white/5" : "bg-gray-50"
                            )}>
                                {/* Search Section */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium opacity-70 block">{t("settings.location.searchLabel")}</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                            placeholder={t("settings.location.searchPlaceholder")}
                                            className={inputClasses}
                                        />
                                        <button
                                            onClick={handleSearch}
                                            disabled={isSearching || !searchQuery.trim()}
                                            className={cn(
                                                "px-3 py-2 rounded-lg flex items-center justify-center transition-colors",
                                                theme === "dark" ? "bg-white/10 hover:bg-white/20" : "bg-gray-200 hover:bg-gray-300"
                                            )}
                                        >
                                            {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                                        </button>
                                    </div>

                                    {/* Search Results */}
                                    {searchResults.length > 0 && (
                                        <div className={cn(
                                            "mt-2 rounded-lg overflow-hidden border max-h-40 overflow-y-auto custom-scrollbar",
                                            theme === "dark" ? "bg-black/40 border-white/10" : "bg-white border-gray-200"
                                        )}>
                                            {searchResults.map((result) => (
                                                <button
                                                    key={result.id}
                                                    onClick={() => handleSelectLocation(result)}
                                                    className={cn(
                                                        "w-full px-3 py-2 text-left text-sm flex items-center justify-between group transition-colors",
                                                        theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-50"
                                                    )}
                                                >
                                                    <span className="truncate">
                                                        <span className="font-bold">{result.name}</span>
                                                        <span className="opacity-60 ml-2 text-xs">
                                                            {[result.admin1, result.country].filter(Boolean).join(", ")}
                                                        </span>
                                                    </span>
                                                    <span className="opacity-0 group-hover:opacity-100 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">
                                                        Select
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed border-gray-500/30">
                                    <div>
                                        <label className="text-xs font-medium opacity-70 mb-1 block">{t("settings.location.latitude")}</label>
                                        <input
                                            type="number"
                                            value={manualCoordinates.latitude}
                                            onChange={(e) => setManualCoordinates({ ...manualCoordinates, latitude: parseFloat(e.target.value) })}
                                            className={inputClasses}
                                            step="0.0001"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium opacity-70 mb-1 block">{t("settings.location.longitude")}</label>
                                        <input
                                            type="number"
                                            value={manualCoordinates.longitude}
                                            onChange={(e) => setManualCoordinates({ ...manualCoordinates, longitude: parseFloat(e.target.value) })}
                                            className={inputClasses}
                                            step="0.0001"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleGetCurrentLocation}
                                    disabled={isLoadingLoc}
                                    className={cn(
                                        "w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all",
                                        theme === "dark"
                                            ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                                            : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                    )}
                                >
                                    {isLoadingLoc ? <span className="animate-spin">⌛</span> : <Navigation size={14} />}
                                    {isLoadingLoc ? t("settings.location.loading") : t("settings.location.getLocation")}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Display Settings */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b pb-2 border-dashed border-gray-500/30 flex items-center gap-2">
                            <Cloud size={18} /> {t("settings.display.title")}
                        </h3>

                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium mb-1">{t("settings.display.showWeather")}</h3>
                                <p className="text-xs opacity-70">
                                    {t("settings.display.showWeatherDesc")}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowWeather(!showWeather)}
                                className={cn(
                                    "relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                                    showWeather
                                        ? "bg-blue-500"
                                        : theme === "dark" ? "bg-white/20" : "bg-gray-200"
                                )}
                            >
                                <span
                                    className={cn(
                                        "absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300",
                                        showWeather ? "translate-x-6" : "translate-x-0"
                                    )}
                                />
                            </button>
                        </div>
                    </div>
                    {/* Section 4: Danger Zone */}
                    <div className="space-y-4 pt-6 border-t border-red-500/20">
                        <h3 className="text-sm font-bold uppercase tracking-wider opacity-50 flex items-center gap-2 text-red-500">
                            <AlertTriangle size={14} /> {t("settings.dangerZone")}
                        </h3>

                        <div className={cn(
                            "p-4 rounded-xl border border-red-500/20 transition-colors",
                            theme === "dark" ? "bg-red-500/5" : "bg-red-50"
                        )}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-red-500">{t("settings.resetApp")}</p>
                                    <p className="text-xs opacity-60 mt-1">{t("settings.resetConfirmDesc")}</p>
                                </div>
                                <button
                                    onClick={handleReset}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-colors"
                                >
                                    {t("settings.resetApp")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className={cn(
                            "px-4 py-2 rounded-lg font-medium transition-colors",
                            theme === "dark"
                                ? "bg-white/10 hover:bg-white/20 text-white"
                                : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                        )}
                    >
                        {t("settings.close")}
                    </button>
                </div>
            </div>
        </div>
    );
}
