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

/**
 * プッシュ通知に購読（バックエンド通知用）
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
    try {
        // 通知許可を確認
        const permission = await requestNotificationPermission();
        if (permission !== 'granted') {
            console.log('🔔 [PWA] Push subscription failed - permission not granted');
            return false;
        }

        // Service Worker取得
        const registration = await navigator.serviceWorker.ready;

        // VAPID公開キーを取得
        const response = await fetch('/api/push/subscribe');
        if (!response.ok) {
            console.error('🔔 [PWA] Failed to get VAPID key');
            return false;
        }
        const { vapidPublicKey } = await response.json();

        if (!vapidPublicKey) {
            console.error('🔔 [PWA] VAPID public key not available');
            return false;
        }

        // URLSafe Base64をUint8Arrayに変換
        const urlBase64ToUint8Array = (base64String: string) => {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
        };

        // Push Managerで購読
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        // バックエンドに保存
        const saveResponse = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                subscription: subscription.toJSON(),
                userAgent: navigator.userAgent,
            }),
        });

        if (!saveResponse.ok) {
            console.error('🔔 [PWA] Failed to save subscription');
            return false;
        }

        console.log('🔔 [PWA] Push subscription successful');
        return true;
    } catch (error) {
        console.error('🔔 [PWA] Push subscription error:', error);
        return false;
    }
}

/**
 * プッシュ通知の購読を解除
 */
export async function unsubscribeFromPush(): Promise<boolean> {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            console.log('🔔 [PWA] No active subscription');
            return true;
        }

        await subscription.unsubscribe();
        console.log('🔔 [PWA] Unsubscribed from push');
        return true;
    } catch (error) {
        console.error('🔔 [PWA] Unsubscribe error:', error);
        return false;
    }
}

/**
 * 現在のプッシュ購読状態を取得
 */
export async function getPushSubscriptionStatus(): Promise<'subscribed' | 'not-subscribed' | 'denied' | 'unsupported'> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        return 'unsupported';
    }

    if (Notification.permission === 'denied') {
        return 'denied';
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return subscription ? 'subscribed' : 'not-subscribed';
    } catch {
        return 'not-subscribed';
    }
}

