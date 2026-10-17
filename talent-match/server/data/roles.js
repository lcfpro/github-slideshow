// IT 職種カタログ。required / preferred はスキルID、salary は年収レンジ（万円）をレベル別に保持。
// テンプレート生成・市場分析・スキルアドバイスの共通マスタとして使う。
export const LEVELS = [
  { id: 'junior', name: 'ジュニア', years: [0, 3] },
  { id: 'middle', name: 'ミドル', years: [3, 7] },
  { id: 'senior', name: 'シニア', years: [7, 30] },
];

export const ROLES = [
  {
    id: 'frontend', name: 'フロントエンドエンジニア', icon: '🖥️',
    required: ['javascript', 'typescript', 'react', 'html_css'],
    preferred: ['nextjs', 'testing', 'uiux', 'graphql', 'cicd'],
    salary: { junior: [400, 550], middle: [550, 750], senior: [750, 1100] },
    duties: ['Webアプリケーションの画面設計・実装', 'デザイナーと連携したUI改善', 'フロントエンドの性能最適化とテスト整備'],
    questions: ['状態管理の設計で工夫した点は？', 'Core Web Vitals を改善した経験は？', 'コンポーネント設計で再利用性をどう担保しましたか？'],
  },
  {
    id: 'backend', name: 'バックエンドエンジニア', icon: '⚙️',
    required: ['api_design', 'sql', 'git'],
    preferred: ['go', 'java', 'python', 'nodejs', 'aws', 'docker', 'microservices', 'redis'],
    anyOf: ['go', 'java', 'python', 'nodejs', 'php', 'ruby', 'kotlin', 'csharp'],
    salary: { junior: [420, 580], middle: [580, 800], senior: [800, 1200] },
    duties: ['サービスのAPI設計・実装', 'DB設計とパフォーマンスチューニング', '非同期処理・外部連携の実装'],
    questions: ['トランザクション設計で失敗した経験は？', 'スケールさせるために行った改善は？', 'APIのバージョニングをどう扱いましたか？'],
  },
  {
    id: 'fullstack', name: 'フルスタックエンジニア', icon: '🧩',
    required: ['typescript', 'react', 'nodejs', 'sql'],
    preferred: ['nextjs', 'aws', 'docker', 'postgresql', 'cicd', 'graphql'],
    salary: { junior: [450, 600], middle: [600, 850], senior: [850, 1200] },
    duties: ['新規プロダクトの企画〜リリースまで一気通貫で開発', 'フロント／バックエンド双方の設計', '開発基盤・CI/CD の整備'],
    questions: ['フロントとバックの境界をどう設計しましたか？', '一人で立ち上げたプロダクトの技術選定理由は？'],
  },
  {
    id: 'mobile', name: 'モバイルアプリエンジニア', icon: '📱',
    required: ['git'],
    anyOf: ['ios', 'android', 'flutter', 'react_native'],
    preferred: ['swift', 'kotlin', 'dart', 'api_design', 'cicd', 'testing'],
    salary: { junior: [420, 560], middle: [560, 780], senior: [780, 1100] },
    duties: ['iOS/Androidアプリの設計・開発', 'ストア審査対応とリリース運用', 'クラッシュ率改善・性能チューニング'],
    questions: ['オフライン対応をどう設計しましたか？', 'アプリのアーキテクチャ（MVVM等）の選定理由は？'],
  },
  {
    id: 'infra', name: 'インフラエンジニア', icon: '🗄️',
    required: ['linux', 'network'],
    preferred: ['aws', 'azure', 'terraform', 'docker', 'observability', 'security'],
    salary: { junior: [380, 520], middle: [520, 720], senior: [720, 1000] },
    duties: ['サーバー・ネットワークの設計構築', 'オンプレからクラウドへの移行', '監視設計と障害対応'],
    questions: ['大きな障害時の対応と再発防止策は？', 'ネットワーク設計で冗長化をどう担保しましたか？'],
  },
  {
    id: 'cloud', name: 'クラウドエンジニア', icon: '☁️',
    required: ['aws', 'terraform', 'linux'],
    preferred: ['kubernetes', 'docker', 'cicd', 'gcp', 'azure', 'cloud_security', 'observability'],
    salary: { junior: [450, 600], middle: [600, 850], senior: [850, 1250] },
    duties: ['クラウド基盤の設計・IaC化', 'コスト最適化と運用自動化', 'マルチアカウント・ガバナンス設計'],
    questions: ['IaC のモジュール設計で工夫した点は？', 'クラウドコストを削減した具体例は？'],
  },
  {
    id: 'sre', name: 'SRE', icon: '🛡️',
    required: ['sre', 'kubernetes', 'observability', 'linux'],
    preferred: ['go', 'python', 'terraform', 'aws', 'gcp', 'cicd'],
    salary: { junior: [500, 650], middle: [650, 900], senior: [900, 1400] },
    duties: ['SLO/エラーバジェットの設計運用', '信頼性向上のための自動化', 'ポストモーテムの推進'],
    questions: ['SLO をどのように決め、合意形成しましたか？', 'トイル削減の具体的な取り組みは？'],
  },
  {
    id: 'data_engineer', name: 'データエンジニア', icon: '🧮',
    required: ['sql', 'python', 'data_eng'],
    preferred: ['gcp', 'aws', 'docker', 'data_analysis', 'terraform'],
    salary: { junior: [450, 600], middle: [600, 850], senior: [850, 1200] },
    duties: ['データ基盤（DWH/データレイク）の設計構築', 'ETL/ELTパイプラインの開発', 'データ品質・メタデータ管理'],
    questions: ['データ品質の問題をどう検知・解決しましたか？', 'バッチとストリーミングの使い分けは？'],
  },
  {
    id: 'data_scientist', name: 'データサイエンティスト', icon: '📊',
    required: ['python', 'ml', 'data_analysis', 'sql'],
    preferred: ['deep_learning', 'llm', 'mlops', 'gcp', 'aws'],
    salary: { junior: [480, 620], middle: [620, 900], senior: [900, 1400] },
    duties: ['ビジネス課題の分析とモデル構築', 'A/Bテスト設計と効果検証', '分析結果の経営層への提言'],
    questions: ['モデルの精度とビジネス価値をどう結びつけましたか？', '分析で失敗した経験と学びは？'],
  },
  {
    id: 'ml_engineer', name: '機械学習/生成AIエンジニア', icon: '🤖',
    required: ['python', 'ml', 'llm'],
    preferred: ['deep_learning', 'mlops', 'docker', 'kubernetes', 'aws', 'gcp', 'api_design'],
    salary: { junior: [550, 700], middle: [700, 1000], senior: [1000, 1600] },
    duties: ['LLMを活用した機能（RAG・エージェント）の開発', 'モデル評価基盤の構築', '推論基盤の最適化'],
    questions: ['LLM アプリの品質評価をどう設計しましたか？', 'ハルシネーション対策として何をしましたか？'],
  },
  {
    id: 'security', name: 'セキュリティエンジニア', icon: '🔐',
    required: ['security', 'network', 'linux'],
    preferred: ['cloud_security', 'aws', 'python', 'observability'],
    salary: { junior: [480, 620], middle: [620, 900], senior: [900, 1400] },
    duties: ['脆弱性診断とセキュリティ設計レビュー', 'SOC運用・インシデント対応', 'セキュリティポリシー策定'],
    questions: ['インシデント対応で最も難しかったケースは？', '開発チームにセキュリティを浸透させた工夫は？'],
  },
  {
    id: 'qa', name: 'QA/テストエンジニア', icon: '✅',
    required: ['testing'],
    preferred: ['python', 'javascript', 'cicd', 'agile', 'sql'],
    salary: { junior: [350, 480], middle: [480, 650], senior: [650, 900] },
    duties: ['テスト計画・設計・実行', 'テスト自動化基盤の構築', '品質メトリクスの可視化'],
    questions: ['自動化対象をどう選定しましたか？', 'リリース判定の基準をどう定めましたか？'],
  },
  {
    id: 'embedded', name: '組込みエンジニア', icon: '🔧',
    required: ['embedded', 'c'],
    preferred: ['cpp', 'linux', 'python', 'testing'],
    salary: { junior: [380, 500], middle: [500, 700], senior: [700, 950] },
    duties: ['車載・家電向けファームウェア開発', 'ハードウェアと連携した評価・デバッグ', '機能安全への対応'],
    questions: ['メモリ制約の厳しい環境での工夫は？', 'ハード起因の不具合をどう切り分けましたか？'],
  },
  {
    id: 'pm', name: 'プロジェクトマネージャー', icon: '📋',
    required: ['pm', 'requirements'],
    preferred: ['agile', 'team_lead', 'english', 'aws'],
    salary: { junior: [500, 650], middle: [650, 900], senior: [900, 1300] },
    duties: ['SI案件のプロジェクト計画・進捗管理', '顧客折衝と要件調整', '品質・コスト・リスク管理'],
    questions: ['炎上プロジェクトを立て直した経験は？', 'ステークホルダー間の対立をどう解消しましたか？'],
  },
  {
    id: 'product_manager', name: 'プロダクトマネージャー', icon: '🎯',
    required: ['product', 'agile'],
    preferred: ['data_analysis', 'uiux', 'requirements', 'english', 'sql'],
    salary: { junior: [550, 700], middle: [700, 1000], senior: [1000, 1500] },
    duties: ['プロダクトのビジョン・ロードマップ策定', 'ユーザー課題の発見と優先順位付け', 'KPI設計と改善サイクルの推進'],
    questions: ['機能の優先順位をどう決めましたか？', '失敗した施策から何を学びましたか？'],
  },
  {
    id: 'tech_lead', name: 'テックリード/EM', icon: '🧭',
    required: ['team_lead', 'microservices', 'api_design'],
    preferred: ['aws', 'kubernetes', 'agile', 'cicd', 'english'],
    salary: { junior: [700, 850], middle: [850, 1100], senior: [1100, 1600] },
    duties: ['技術方針の策定とアーキテクチャ設計', 'エンジニアの採用・育成・評価', '開発プロセス改善'],
    questions: ['技術的負債の返済をどう進めましたか？', 'メンバーの成長をどう支援しましたか？'],
  },
  {
    id: 'sap', name: 'SAPコンサルタント', icon: '🏢',
    required: ['sap', 'requirements'],
    preferred: ['abap', 'pm', 'english', 'sql'],
    salary: { junior: [500, 650], middle: [650, 950], senior: [950, 1400] },
    duties: ['S/4HANA 導入の要件定義・Fit&Gap', '業務プロセス設計', 'アドオン開発の仕様策定'],
    questions: ['Fit&Gap で標準化を推進した経験は？', '移行プロジェクトでのリスク管理は？'],
  },
  {
    id: 'uiux', name: 'UI/UXデザイナー', icon: '🎨',
    required: ['uiux'],
    preferred: ['html_css', 'javascript', 'product', 'data_analysis'],
    salary: { junior: [380, 520], middle: [520, 720], senior: [720, 1000] },
    duties: ['ユーザー調査とペルソナ設計', 'ワイヤーフレーム・プロトタイプ作成', 'デザインシステムの構築'],
    questions: ['デザインの意思決定をデータでどう裏付けましたか？', 'エンジニアとの協業で工夫した点は？'],
  },
];

export const ROLE_BY_ID = Object.fromEntries(ROLES.map((r) => [r.id, r]));

export function levelFromYears(years) {
  if (years >= 7) return 'senior';
  if (years >= 3) return 'middle';
  return 'junior';
}

export const PREFECTURES = ['東京都', '神奈川県', '大阪府', '愛知県', '福岡県', '北海道', '宮城県', '京都府', '兵庫県', '埼玉県', '千葉県', '広島県'];
