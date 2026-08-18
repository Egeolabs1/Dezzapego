let turnstileLoadPromise: Promise<void> | null = null;

export function loadTurnstile() {
    if (typeof window !== 'undefined' && window.turnstile) {
        return Promise.resolve();
    }

    if (turnstileLoadPromise) {
        return turnstileLoadPromise;
    }

    turnstileLoadPromise = new Promise((resolve, reject) => {
        const existingScript = document.querySelector<HTMLScriptElement>(
            'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
        );

        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(), { once: true });
            existingScript.addEventListener('error', () => {
                turnstileLoadPromise = null; // Allow retry
                reject(new Error('Failed to load Turnstile'));
            }, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.addEventListener('load', () => resolve(), { once: true });
        script.addEventListener('error', () => {
            turnstileLoadPromise = null; // Allow retry
            reject(new Error('Failed to load Turnstile'));
        }, { once: true });
        document.head.appendChild(script);
    });

    return turnstileLoadPromise;
}
