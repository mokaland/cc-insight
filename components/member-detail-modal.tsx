"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

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
  // ESCキーで閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* モーダルカード */}
      <div 
        className="relative glass-premium rounded-2xl p-8 max-w-md w-full border-2 animate-in fade-in zoom-in duration-200"
        style={{
          borderColor: `${teamColor}40`,
          boxShadow: `0 0 60px ${teamColor}30`
        }}
      >
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full glass-bg flex items-center justify-center hover:bg-white/20 transition-colors"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

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
              <img
                src={member.guardianData.imagePath}
                alt={member.guardianData.name}
                className="w-full h-full object-contain guardian-floating"
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
                label="📈 フォロワー増加" 
                value={member.followerGrowth?.toLocaleString() || '0'} 
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

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="mt-8 w-full py-4 rounded-xl font-bold text-white transition-all hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${teamColor}CC, ${teamColor}99)`,
            boxShadow: `0 10px 30px ${teamColor}40`
          }}
        >
          閉じる
        </button>
      </div>
    </div>
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
