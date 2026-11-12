declare const __APP_VERSION__: string | undefined;
declare const __APP_BUILD__: string | undefined;
declare const __APP_COMMIT__: string | undefined;

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1.0';
export const APP_BUILD = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : '1';
export const APP_COMMIT = typeof __APP_COMMIT__ !== 'undefined' ? __APP_COMMIT__ : 'dev';

export const APP_VERSION_LABEL = `v${APP_VERSION} · Build #${APP_BUILD} (${APP_COMMIT})`;
