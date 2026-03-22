# FutureBalance

**次の給料日の予測残高でクレカ浪費を防ぐ** 個人用資産管理PWA

## コンセプト

「今この支出をすると、次の給料日時点の予測残高がいくらになるか」を強く可視化することで、
クレジットカードの使いすぎを抑制することを目的としています。

## 機能

- **次の給料日予測残高**をホーム画面のメインに表示
- **危険度（安全/注意/危険）**を色で直感的に把握
- **クレカ未引落額**を未来残高に反映（引き落とし前でも残高を減らして計算）
- **経費立替**を通常の支出と分けて管理（立替中の実態と回収予定を両方表示）
- PayPay・PASMO などのプリペイド残高を総資産として管理
- 固定費（家賃・サブスク）を予測残高に自動反映

## 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript |
| スタイル | Tailwind CSS |
| UIコンポーネント | shadcn/ui + Radix UI |
| ORM | Prisma |
| DB | SQLite |
| PWA | Service Worker (手動実装) |

## セットアップ

### 必要な環境

- Node.js 18 以上
- npm 9 以上

### 手順

```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd future-balance

# 2. 依存関係をインストール
npm install

# 3. データベースを初期化
npm run db:push

# 4. シードデータを投入（デモ用のダミーデータ）
npm run db:seed

# 5. 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開く。

### シードデータの内容

- 口座: 銀行・現金・PayPay・PASMO・楽天カード（計5口座）
- 設定: 給料日25日、手取り28万円、危険ライン5万円
- 固定費: 家賃・Netflix・Spotify・スマホ代（計4件）
- 取引: クレカ未引落5件（うち経費立替2件）、その他5件

## 予測残高の計算ロジック

```
予測残高 =
  現在保有残高（クレカ以外の口座合計）
  - クレカ未引落合計
  - 今日〜給料日の間に落ちる固定費
  + 次の給与額

※ 経費立替は予測残高には含めず、別途「回収予定」として表示
```

## 画面構成

| 画面 | URL | 説明 |
|------|-----|------|
| ホーム | `/` | 予測残高・危険度・最近の支出 |
| 支出追加 | `/add` | リアルタイム残高プレビュー付き支出入力 |
| 資産一覧 | `/assets` | 口座残高・クレカ未引落・経費立替の全貌 |
| 設定 | `/settings` | 給料日・給与・危険ライン・固定費管理 |

## ディレクトリ構成

```
├── app/
│   ├── layout.tsx          # PWAメタタグ・ナビゲーション
│   ├── page.tsx            # ホーム（予測残高カード）
│   ├── add/page.tsx        # 支出追加
│   ├── assets/page.tsx     # 資産一覧
│   ├── settings/page.tsx   # 設定
│   └── api/
│       ├── prediction/     # 予測残高計算エンドポイント
│       ├── transactions/   # 支出CRUD
│       ├── accounts/       # 口座残高更新
│       ├── recurring/      # 固定費CRUD
│       └── settings/       # 設定取得・更新
├── components/
│   ├── ui/                 # shadcn/ui コンポーネント
│   ├── PredictionCard.tsx  # 予測残高メインカード
│   ├── DangerMeter.tsx     # 危険度バー
│   ├── BalancePreview.tsx  # 支出入力時の残高プレビュー
│   ├── TransactionItem.tsx # 取引リスト行
│   └── Navigation.tsx      # ボトムナビゲーション
├── lib/
│   ├── prediction.ts       # 予測残高計算ロジック（純粋関数）
│   ├── dateUtils.ts        # 日付・通貨フォーマット
│   ├── prisma.ts           # Prismaクライアント
│   └── types.ts            # 型定義
└── prisma/
    ├── schema.prisma       # DBスキーマ
    └── seed.ts             # シードデータ
```

## npm スクリプト

| コマンド | 内容 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run start` | プロダクションサーバー起動 |
| `npm run db:push` | DBスキーマを適用 |
| `npm run db:seed` | シードデータを投入 |
| `npm run db:studio` | Prisma Studio（DB GUI）を起動 |

## 次に実装すること

- [ ] 口座残高の手動更新UI
- [ ] クレカ引落処理（一括で isBilled=true に更新）
- [ ] 経費精算済みマーク
- [ ] 振替機能（銀行→PayPayチャージなど）
- [ ] 変動給与の追加入力
- [ ] PWAアイコン画像の作成
