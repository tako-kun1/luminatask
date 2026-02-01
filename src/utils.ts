import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Parses release notes body and extracts content based on language language.
 * Convention:
 * Common content (always shown)
 * <!-- @ja -->
 * Japanese content
 * <!-- @end -->
 * <!-- @en -->
 * English content
 * <!-- @end -->
 */
export function parseReleaseNotes(body: string, lang: string): string {
    if (!body) return "";

    const langMarker = `<!-- @${lang} -->`;
    const endMarker = `<!-- @end -->`;

    // 1. Check if language specific section exists
    const startIndex = body.indexOf(langMarker);
    if (startIndex !== -1) {
        const contentStart = startIndex + langMarker.length;
        const endIndex = body.indexOf(endMarker, contentStart);

        if (endIndex !== -1) {
            // Found a block. Extract it.
            // We also want to include any "Common" content at the top (before any language markers)
            // But usually common content is limited if we split by language.
            // Let's simpler approach: Return the block + common header? 
            // Or just return the block. Usually localized notes are full replacements.
            return body.substring(contentStart, endIndex).trim();
        }
    }

    // 2. Fallback: If no matching section, check if there are ANY language sections.
    // If there are language sections but not for current lang, maybe show English (default) or Full body?
    // Let's fallback to full body if exact match not found.
    return body;
}
