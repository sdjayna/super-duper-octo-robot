declare global {
    interface Window {
        logDebug?: (...args: any[]) => void;
        logInfo?: (...args: any[]) => void;
        logWarn?: (...args: any[]) => void;
        logError?: (...args: any[]) => void;
        webkitAudioContext?: typeof AudioContext;
    }

    interface Element {
        value?: any;
        disabled?: boolean;
        checked?: boolean;
        files?: FileList | null;
        dataset?: DOMStringMap;
        options?: HTMLOptionsCollection;
        selectedIndex?: number;
        style?: CSSStyleDeclaration;
        min?: string | number;
        max?: string | number;
        blur?: () => void;
    }

    interface EventTarget {
        value?: any;
        checked?: boolean;
        files?: FileList | null;
        dataset?: DOMStringMap;
        style?: CSSStyleDeclaration;
        blur?: () => void;
    }
}

export {};
