/**
 * PWA Service Worker 登録
 *
 * アプリケーションロード時にService Workerを登録し、
 * プッシュ通知の許可を求める
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        console.log('📱 [PWA] Service Worker not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });

        console.log('📱 [PWA] Service Worker registered:', registration.scope);

        // 更新があればすぐに適用
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('📱 [PWA] New version available');
                    }
                });
            }
        });

        return registration;
    } catch (error) {
        console.error('📱 [PWA] Registration failed:', error);
        return null;
    }
}

/**
 * プッシュ通知の許可を求める
 */
export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'default'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        console.log('🔔 [PWA] Notifications not supported');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission === 'denied') {
        console.log('🔔 [PWA] Notifications denied by user');
        return 'denied';
    }

    try {
        const permission = await Notification.requestPermission();
        console.log('🔔 [PWA] Notification permission:', permission);
        return permission;
    } catch (error) {
        console.error('🔔 [PWA] Permission request failed:', error);
        return 'denied';
    }
}

/**
 * ローカル通知を送信（テスト用）
 */
export async function sendLocalNotification(
    title: string,
    body: string,
    url?: string
): Promise<void> {
    const permission = await requestNotificationPermission();

    if (permission !== 'granted') {
        console.log('🔔 [PWA] Cannot send notification - permission not granted');
        return;
    }

    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
        console.log('🔔 [PWA] No service worker registration');
        return;
    }

    await registration.showNotification(title, {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: { url: url || '/' },
        tag: 'local-notification',
    });
}
