const preferenceKey = 'eshop_display_preference';

export function loadSavedPreference() {
    const saved = window.localStorage.getItem(preferenceKey);
    const useDark = saved === 'dark';
    applyToDocument(useDark);
    return useDark;
}

export function applyModeChange(useDarkMode) {
    window.localStorage.setItem(preferenceKey, useDarkMode ? 'dark' : 'light');
    applyToDocument(useDarkMode);
}

function applyToDocument(darkEnabled) {
    document.documentElement.classList.toggle('dark-scheme', darkEnabled);
}
