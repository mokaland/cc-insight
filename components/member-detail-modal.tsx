"use client";

import { X, AlertTriangle, TrendingUp, Calendar, MessageCircle, Crown } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { getUserRecentReports, detectAnomalies, Report, AnomalyFlags } from "@/lib/firestore";
import { calculateLevel, getLevelTitle } from "@/lib/guardian-collection";

interface MemberDetailModalProps {
  member: any;
  isOpen: boolean;
  onClose: () => void;
  teamColor: string;
  teamName: string;
  isShorts: boolean;
}

export function MemberDetailModal({ 
  member, 
  isOpen, 
  onClose, 
  teamColor,
  teamName,
  isShorts
}: MemberDetailModalProps) {
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyFlags | null>(null);
  const [loading, setLoading] = useState(false);

  // 👁️ 過去履歴と異常値検知（ピアプレッシャー）
  useEffect(() => {
    if (!isOpen || !member?.userId) return;
    
    const loadHistory = async () => {
      setLoading(true);
      try {
        const reports = await getUserRecentReports(member.userId, 7);
        setRecentReports(reports);
        
        // 異常値検知
        const flags = detectAnomalies(
          reports, 
          member.energy || 0,
          member.guardianData?.stage || 0
        );
        setAnomalies(flags);
      } catch (error) {
        console.error("履歴取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadHistory();
  }, [isOpen, member?.userId, member?.energy, member?.guardianData?.stage]);

  const scrollYRef = useRef(0);

  // PWA/iOS Safari対応: 背景スクロールを完全に防止
  useEffect(() => {
    if (isOpen) {
      scrollYRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      const preventTouchMove = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        // モーダルコンテンツ内のスクロール可能領域は許可
        if (target.closest('.modal-scrollable')) {
          return;
        }
        e.preventDefault();
      };
      document.addEventListener('touchmove', preventTouchMove, { passive: false });

      return () => {
        document.removeEventListener('touchmove', preventTouchMove);
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        window.scrollTo(0, scrollYRef.current);
      };
    }
  }, [isOpen]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !member) return null;

  const hasAnomalies = anomalies && Object.values(anomalies).some(v => v);

  // レベル計算
  const totalEarned = member.totalEarned || 0;
  const memberLevel = calculateLevel(totalEarned);
  const levelTitle = getLevelTitle(memberLevel);

  return (
    <>
      {/* PWA対応: セーフエリアを含む画面全体を覆う背景 */}
      <div
        className="fixed z-[9998]"
        style={{
          position: 'fixed',
          top: 'calc(-1 * env(safe-area-inset-top, 0px) - 50px)',
          left: 'calc(-1 * env(safe-area-inset-left, 0px) - 50px)',
          right: 'calc(-1 * env(safe-area-inset-right, 0px) - 50px)',
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px) - 50px)',
          minWidth: 'calc(100vw + 100px)',
          minHeight: 'calc(100vh + 100px)',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          touchAction: 'none',
        }}
        onClick={onClose}
      />

      {/* モーダルコンテナ */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
        }}
      >
      {/* モーダルカード */}
      <div
        className="relative glass-premium rounded-2xl p-8 max-w-md w-full max-h-full overflow-y-auto border-2 animate-in fade-in zoom-in duration-200 modal-scrollable"
        style={{
          borderColor: `${teamColor}40`,
          boxShadow: `0 0 60px ${teamColor}30`,
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        {/* ヘッダーボタン */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {/* 即座DMボタン */}
          {member.slackId && (
            <button
              onClick={() => {
                // Slackアプリでダイレクトメッセージを開く
                window.open(`slack://user?team=T07QUNB641Y&id=${member.slackId}`, '_blank');
              }}
              className="w-8 h-8 rounded-full glass-bg flex items-center justify-center hover:bg-purple-500/30 transition-all hover:scale-110 group"
              aria-label="Slackでメッセージを送る"
              title="Slackでメッセージを送る"
            >
              <MessageCircle className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
            </button>
          )}

          {/* 閉じるボタン */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full glass-bg flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 守護神フルサイズ画像 */}
        {member.guardianData ? (
          <div className="w-40 h-40 mx-auto mb-6 relative">
            {/* オーラリング */}
            <div 
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                border: `3px solid ${member.guardianData.color}`,
                boxShadow: `0 0 40px ${member.guardianData.color}80, 0 0 60px ${member.guardianData.color}40`,
              }}
            />
            
            {/* 内側のグロー */}
            <div 
              className="absolute inset-2 rounded-full opacity-20"
              style={{
                background: `radial-gradient(circle, ${member.guardianData.color} 0%, transparent 70%)`
              }}
            />

            {/* 守護神画像 */}
            <div className="absolute inset-2 rounded-full overflow-hidden bg-black/40">
              <Image
                src={member.guardianData.imagePath}
                alt={member.guardianData.name}
                width={144}
                height={144}
                className="w-full h-full object-contain guardian-floating"
                loading="lazy"
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0IiBoZWlnaHQ9IjE0NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTQ0IiBoZWlnaHQ9IjE0NCIgZmlsbD0iIzIyMiIvPjwvc3ZnPg=="
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              {/* フォールバック絵文字 */}
              <div className="hidden absolute inset-0 flex items-center justify-center text-6xl">
                {member.guardianData.emoji}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="w-40 h-40 mx-auto mb-6 rounded-full flex items-center justify-center text-6xl"
            style={{
              backgroundColor: `${teamColor}20`,
              boxShadow: `0 0 40px ${teamColor}`,
              border: `3px solid ${teamColor}`,
            }}
          >
            🥚
          </div>
        )}

        {/* メンバー情報 */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold mb-2" style={{ color: teamColor }}>
            {member.name}
          </h2>
          {/* レベル & 称号 */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-yellow-400" />
            <span className="text-xl font-bold text-yellow-400">Lv.{memberLevel}</span>
            <span className="text-purple-400 font-medium">{levelTitle}</span>
          </div>
          <p className="text-slate-300 text-sm mb-1">
            {teamName}
          </p>
          {member.guardianData && (
            <p
              className="text-lg font-medium"
              style={{ color: member.guardianData.color }}
            >
              {member.guardianData.stageName} - {member.guardianData.name}
            </p>
          )}
        </div>

        {/* 詳細KPI（ステータス画面風） */}
        <div className="space-y-3">
          {/* エナジー（最優先） */}
          <StatRow 
            label="💎 エナジー" 
            value={`${member.energy || 0}E`} 
            highlight={true}
            color={teamColor} 
          />

          {/* チームタイプ別KPI */}
          {isShorts ? (
            <>
              <StatRow
                label="👁️ 再生数"
                value={member.views?.toLocaleString() || '0'}
              />
              <StatRow
                label="👤 プロフアクセス"
                value={member.profileAccess?.toLocaleString() || '0'}
              />
              <StatRow
                label="💬 交流数"
                value={member.interactions?.toLocaleString() || '0'}
              />
              <StatRow
                label="👥 総フォロワー"
                value={member.totalFollowers?.toLocaleString() || '0'}
              />
            </>
          ) : (
            <>
              <StatRow
                label="❤️ いいね回り"
                value={member.likes?.toLocaleString() || '0'}
              />
              <StatRow
                label="💬 リプライ回り"
                value={member.replies?.toLocaleString() || '0'}
              />
              <StatRow
                label="⚡ 総活動量"
                value={((member.likes || 0) + (member.replies || 0)).toLocaleString()}
              />
            </>
          )}

          {/* 共通KPI */}
          <StatRow 
            label="📝 投稿数" 
            value={member.posts || '0'} 
          />
          <StatRow 
            label="📊 報告回数" 
            value={`${member.reports || 0}回`} 
          />
          {member.achievementRate !== undefined && (
            <StatRow 
              label="🎯 達成率" 
              value={`${member.achievementRate}%`}
              highlight={member.achievementRate >= 100}
              color={member.achievementRate >= 100 ? '#22c55e' : undefined}
            />
          )}
        </div>

        {/* 👁️ ピアプレッシャー：異常値警告 */}
        {hasAnomalies && (
          <div className="mt-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-bold text-orange-400">疑わしい活動パターン</span>
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              {anomalies?.highEnergyLowOutput && (
                <div className="flex items-start gap-2">
                  <span>⚠️</span>
                  <span>高エナジーだが成果が低い</span>
                </div>
              )}
              {anomalies?.frequentModification && (
                <div className="flex items-start gap-2">
                  <span>📝</span>
                  <span>報告の修正回数が異常に多い</span>
                </div>
              )}
              {anomalies?.inconsistentGrowth && (
                <div className="flex items-start gap-2">
                  <span>📈</span>
                  <span>急激な成長（不自然な変化）</span>
                </div>
              )}
              {anomalies?.suspiciousPattern && (
                <div className="flex items-start gap-2">
                  <span>🔍</span>
                  <span>怪しい数値パターン</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 👁️ 過去7日間の戦歴 */}
        {recentReports.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-300">過去7日間の戦歴</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recentReports.map((report, index) => (
                <div 
                  key={index}
                  className="p-3 rounded-lg bg-white/5 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400">{report.date}</span>
                    {(report as any).modifyCount > 0 && (
                      <span className="text-orange-400">
                        修正{(report as any).modifyCount}回
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>
                      {isShorts 
                        ? `再生 ${(report.igViews || 0).toLocaleString()}` 
                        : `投稿 ${(report.postCount || 0)}`}
                    </span>
                    <span>
                      {isShorts
                        ? `投稿 ${((report.igPosts || 0) + (report.ytPosts || 0) + (report.tiktokPosts || 0))}`
                        : `活動 ${((report.likeCount || 0) + (report.replyCount || 0))}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 閉じるボタン - PWA対応で下部に余裕を持たせる */}
        <button
          onClick={onClose}
          className="mt-8 mb-4 w-full py-4 rounded-xl font-bold text-white transition-all hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${teamColor}CC, ${teamColor}99)`,
            boxShadow: `0 10px 30px ${teamColor}40`
          }}
        >
          閉じる
        </button>
      </div>
      </div>
    </>
  );
}

// ステータス行コンポーネント
function StatRow({ 
  label, 
  value, 
  highlight = false, 
  color 
}: { 
  label: string; 
  value: string | number; 
  highlight?: boolean;
  color?: string;
}) {
  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
        highlight ? 'glass-bg border' : 'bg-white/5'
      }`}
      style={highlight && color ? { borderColor: `${color}40` } : undefined}
    >
      <span className="text-sm text-slate-300">{label}</span>
      <span 
        className={`font-bold ${highlight ? 'text-xl' : 'text-lg'}`}
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
