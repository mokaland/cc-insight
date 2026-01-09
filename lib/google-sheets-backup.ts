import { google } from 'googleapis';
import { db } from './firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';

// Google Sheets APIの認証情報
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// 環境変数から認証情報を取得
function getAuthClient() {
  const credentials = process.env.GOOGLE_SHEETS_CREDENTIALS;
  if (!credentials) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable is not set');
  }

  const parsed = JSON.parse(credentials);
  const auth = new google.auth.GoogleAuth({
    credentials: parsed,
    scopes: SCOPES,
  });

  return auth;
}

// Firestoreの全レポートをGoogle Sheetsにバックアップ
export async function backupReportsToSheets(): Promise<{ success: boolean; rowsWritten: number; error?: string }> {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID environment variable is not set');
    }

    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // Firestoreから全レポートを取得
    const reportsRef = collection(db, 'reports');
    const q = query(reportsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: true, rowsWritten: 0 };
    }

    // ヘッダー行
    const headers = [
      'ID',
      'チーム',
      'チームタイプ',
      '名前',
      '日付',
      '作成日時',
      'ユーザーID',
      'メールアドレス',
      // Shorts系
      'アカウントID',
      'IG再生数',
      'IGプロフアクセス',
      'IG外部タップ',
      'IGインタラクション',
      '週間ストーリー',
      'IGフォロワー',
      'YTフォロワー',
      'TikTokフォロワー',
      'コメント',
      'IG投稿数',
      'YT投稿数',
      'TikTok投稿数',
      // X系
      '投稿数',
      '投稿URL',
      'いいね数',
      'リプライ数',
      'Xフォロワー',
    ];

    // データ行
    const rows: any[][] = [headers];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt;

      rows.push([
        doc.id,
        data.team || '',
        data.teamType || '',
        data.name || '',
        data.date || '',
        createdAt || '',
        data.userId || '',
        data.userEmail || '',
        // Shorts系
        data.accountId || '',
        data.igViews || 0,
        data.igProfileAccess || 0,
        data.igExternalTaps || 0,
        data.igInteractions || 0,
        data.weeklyStories || 0,
        data.igFollowers || 0,
        data.ytFollowers || 0,
        data.tiktokFollowers || 0,
        data.todayComment || '',
        data.igPosts || 0,
        data.ytPosts || 0,
        data.tiktokPosts || 0,
        // X系
        data.postCount || 0,
        (data.postUrls || []).join(', '),
        data.likeCount || 0,
        data.replyCount || 0,
        data.xFollowers || 0,
      ]);
    });

    // 日付をシート名に使用（例: reports_2026-01-09）
    const today = new Date().toISOString().split('T')[0];
    const sheetName = `reports_${today}`;

    // 新しいシートを作成
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });
    } catch (e: any) {
      // シートが既に存在する場合はクリアして上書き
      if (e.message?.includes('already exists')) {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${sheetName}!A:Z`,
        });
      } else {
        throw e;
      }
    }

    // データを書き込み
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });

    console.log(`✅ Backup completed: ${rows.length - 1} reports written to sheet "${sheetName}"`);

    return { success: true, rowsWritten: rows.length - 1 };
  } catch (error: any) {
    console.error('❌ Backup failed:', error);
    return { success: false, rowsWritten: 0, error: error.message };
  }
}

// ユーザーデータもバックアップ
export async function backupUsersToSheets(): Promise<{ success: boolean; rowsWritten: number; error?: string }> {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID environment variable is not set');
    }

    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // Firestoreからユーザーを取得
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    if (snapshot.empty) {
      return { success: true, rowsWritten: 0 };
    }

    // ヘッダー行
    const headers = [
      'ユーザーID',
      '名前',
      'メールアドレス',
      'チーム',
      'ロール',
      '承認状態',
      '作成日時',
    ];

    // データ行
    const rows: any[][] = [headers];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt || '';

      rows.push([
        doc.id,
        data.name || data.displayName || '',
        data.email || '',
        data.team || '',
        data.role || 'member',
        data.approved ? 'はい' : 'いいえ',
        createdAt,
      ]);
    });

    // 日付をシート名に使用
    const today = new Date().toISOString().split('T')[0];
    const sheetName = `users_${today}`;

    // 新しいシートを作成
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${sheetName}!A:Z`,
        });
      } else {
        throw e;
      }
    }

    // データを書き込み
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });

    console.log(`✅ Users backup completed: ${rows.length - 1} users written to sheet "${sheetName}"`);

    return { success: true, rowsWritten: rows.length - 1 };
  } catch (error: any) {
    console.error('❌ Users backup failed:', error);
    return { success: false, rowsWritten: 0, error: error.message };
  }
}

// 守護神プロファイルもバックアップ
export async function backupGuardianProfilesToSheets(): Promise<{ success: boolean; rowsWritten: number; error?: string }> {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID environment variable is not set');
    }

    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // Firestoreから守護神プロファイルを取得
    const profilesRef = collection(db, 'guardianProfiles');
    const snapshot = await getDocs(profilesRef);

    if (snapshot.empty) {
      return { success: true, rowsWritten: 0 };
    }

    // ヘッダー行
    const headers = [
      'ユーザーID',
      'アクティブ守護神ID',
      '現在のエナジー',
      '総獲得エナジー',
      '連続日数',
      '最長連続日数',
      '最終報告日',
    ];

    // データ行
    const rows: any[][] = [headers];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const lastReportDate = data.streak?.lastReportDate instanceof Timestamp
        ? data.streak.lastReportDate.toDate().toISOString().split('T')[0]
        : data.streak?.lastReportDate || '';

      rows.push([
        doc.id,
        data.activeGuardianId || '',
        data.energy?.current || 0,
        data.energy?.total || 0,
        data.streak?.currentStreak || 0,
        data.streak?.longestStreak || 0,
        lastReportDate,
      ]);
    });

    // 日付をシート名に使用
    const today = new Date().toISOString().split('T')[0];
    const sheetName = `guardians_${today}`;

    // 新しいシートを作成
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${sheetName}!A:Z`,
        });
      } else {
        throw e;
      }
    }

    // データを書き込み
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });

    console.log(`✅ Guardian profiles backup completed: ${rows.length - 1} profiles written to sheet "${sheetName}"`);

    return { success: true, rowsWritten: rows.length - 1 };
  } catch (error: any) {
    console.error('❌ Guardian profiles backup failed:', error);
    return { success: false, rowsWritten: 0, error: error.message };
  }
}

// 全データをバックアップ
export async function backupAllDataToSheets(): Promise<{
  reports: { success: boolean; rowsWritten: number; error?: string };
  users: { success: boolean; rowsWritten: number; error?: string };
  guardians: { success: boolean; rowsWritten: number; error?: string };
}> {
  const [reports, users, guardians] = await Promise.all([
    backupReportsToSheets(),
    backupUsersToSheets(),
    backupGuardianProfilesToSheets(),
  ]);

  return { reports, users, guardians };
}
