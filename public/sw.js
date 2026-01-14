/**
 * CC-Insight PWA Service Worker
 *
 * 機能:
 * - キャッシュ管理 (App Shell + 動的コンテンツ)
 * - プッシュ通知受信
 * - オフライン対応
 */

const CACHE_NAME = 'cc-insight-v1';
const APP_SHELL = [
    '/',
    '/login',
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png'
];

// インストール時にApp Shellをキャッシュ
self.addEventListener('install', (event) => {
    console.log('📦 [SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 [SW] Caching App Shell');
            return cache.addAll(APP_SHELL);
        })
    );
    self.skipWaiting();
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
    console.log('✅ [SW] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// フェッチ時のキャッシュ戦略（Network First with Cache Fallback）
self.addEventListener('fetch', (event) => {
    // API リクエストやFirebaseはスキップ
    if (
        event.request.url.includes('/api/') ||
        event.request.url.includes('firebaseapp.com') ||
        event.request.url.includes('googleapis.com') ||
        event.request.url.includes('firestore.googleapis.com')
    ) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 成功したらキャッシュに保存
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // ネットワークエラー時はキャッシュから返す
                return caches.match(event.request);
            })
    );
});

// プッシュ通知受信
self.addEventListener('push', (event) => {
    console.log('🔔 [SW] Push received');

    let data = { title: 'キャリクラ', body: '新しい通知があります' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/',
            dateOfArrival: Date.now(),
        },
        actions: data.actions || [],
        tag: data.tag || 'default',
        renotify: true,
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
    console.log('👆 [SW] Notification clicked');

    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // 既存のウィンドウがあればフォーカス
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(urlToOpen);
                    return client.focus();
                }
            }
            // なければ新規ウィンドウを開く
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
