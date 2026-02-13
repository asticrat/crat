/**
 * Security utilities to prevent inspection and tampering
 */

/**
 * Detects if DevTools is open
 */
export function detectDevTools(): boolean {
    const threshold = 160;
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    return widthThreshold || heightThreshold;
}

/**
 * Clears sensitive data from memory
 */
export function clearSensitiveData(data: string): void {
    // Overwrite the string in memory (best effort in JavaScript)
    if (typeof data === 'string') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data as any) = '\0'.repeat(data.length);
    }
}

/**
 * Prevents debugging by detecting breakpoints
 */
export function antiDebug(): void {
    setInterval(() => {
        const start = performance.now();
        // eslint-disable-next-line no-debugger
        debugger;
        const end = performance.now();

        // If execution was paused (debugger active), reload page
        if (end - start > 100) {
            window.location.reload();
        }
    }, 1000);
}

/**
 * Disables right-click context menu
 */
export function disableContextMenu(): void {
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });
}

/**
 * Disables common developer shortcuts
 */
export function disableDevShortcuts(): void {
    document.addEventListener('keydown', (e) => {
        // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
            (e.ctrlKey && e.key === 'U')
        ) {
            e.preventDefault();
            return false;
        }
    });
}

/**
 * Obfuscates data in transit to prevent network inspection
 */
export function obfuscateData(data: string): string {
    // Add random padding to make pattern recognition harder
    const padding = Math.random().toString(36).substring(7);
    return btoa(padding + '::' + data + '::' + padding);
}

/**
 * De-obfuscates data
 */
export function deobfuscateData(data: string): string {
    const decoded = atob(data);
    const parts = decoded.split('::');
    return parts[1] || '';
}

/**
 * Initializes all security measures
 */
export function initSecurity(options: {
    disableDevTools?: boolean;
    disableContextMenu?: boolean;
    disableShortcuts?: boolean;
    antiDebug?: boolean;
} = {}): void {
    const {
        disableDevTools = true,
        disableContextMenu: disableContext = true,
        disableShortcuts = true,
        antiDebug: enableAntiDebug = false, // Disabled by default as it can be annoying
    } = options;

    if (disableContext) {
        disableContextMenu();
    }

    if (disableShortcuts) {
        disableDevShortcuts();
    }

    if (disableDevTools) {
        // Monitor for DevTools
        setInterval(() => {
            if (detectDevTools()) {
                console.clear();
                // Optionally: window.location.reload();
            }
        }, 1000);
    }

    if (enableAntiDebug) {
        antiDebug();
    }

    // Clear console periodically to remove any leaked data
    setInterval(() => {
        console.clear();
    }, 5000);
}
