// Patch para permitir que o Cloudflare Turnstile funcione em ambientes com Trusted Types rigorosos
if (window.trustedTypes && window.trustedTypes.createPolicy) {
    if (!window.trustedTypes.defaultPolicy) {
        try {
            window.trustedTypes.createPolicy('default', {
                createHTML: (string) => string,
                createScriptURL: (string) => string,
                createScript: (string) => string,
            });
            console.log('Turnstile CSP Patch: Default policy created.');
        } catch (e) {
            console.warn('Turnstile CSP Patch: Could not create default policy.', e);
        }
    }
}

// Turnstile global callbacks - bridge to React state via custom events
window.onTurnstileContactSuccess = function(token) {
    window._turnstileTokenContact = token;
    window.dispatchEvent(new CustomEvent('turnstile-contact', { detail: token }));
};
window.onTurnstileReportSuccess = function(token) {
    window._turnstileTokenReport = token;
    window.dispatchEvent(new CustomEvent('turnstile-report', { detail: token }));
};
