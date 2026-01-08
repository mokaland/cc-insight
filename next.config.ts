import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🆕 画像最適化設定
  images: {
    formats: ['image/webp'], // WebPフォーマットを優先
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // レスポンシブサイズ
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // アイコンサイズ
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1年間キャッシュ
  },

  // 🆕 ビルド最適化設定
  // 本番環境でのソースマップ無効化（ビルド高速化）
  productionBrowserSourceMaps: false,

  // 実験的機能
  experimental: {
    // 並列ビルドの最適化（アイコンライブラリとUIライブラリ）
    optimizePackageImports: ['lucide-react', '@radix-ui/react-tabs'],
  },
};

export default nextConfig;
