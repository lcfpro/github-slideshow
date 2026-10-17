// IT スキル辞書。aliases は抽出時の表記ゆれ吸収、demand は市場需要（0-100）、
// growth は前年比の需要トレンド（%）、hours は習得目安時間、resources は学習リソース例。
export const SKILLS = [
  // 言語
  { id: 'javascript', name: 'JavaScript', cat: '言語', aliases: ['js', 'ecmascript', 'es6'], demand: 88, growth: 2, hours: 120 },
  { id: 'typescript', name: 'TypeScript', cat: '言語', aliases: ['ts'], demand: 92, growth: 14, hours: 80 },
  { id: 'python', name: 'Python', cat: '言語', aliases: ['py', 'パイソン'], demand: 93, growth: 11, hours: 120 },
  { id: 'java', name: 'Java', cat: '言語', aliases: ['ジャバ', 'jdk'], demand: 85, growth: -2, hours: 160 },
  { id: 'go', name: 'Go', cat: '言語', aliases: ['golang', 'go言語'], demand: 80, growth: 12, hours: 100 },
  { id: 'rust', name: 'Rust', cat: '言語', aliases: [], demand: 58, growth: 22, hours: 200 },
  { id: 'kotlin', name: 'Kotlin', cat: '言語', aliases: [], demand: 66, growth: 5, hours: 100 },
  { id: 'swift', name: 'Swift', cat: '言語', aliases: [], demand: 62, growth: 1, hours: 100 },
  { id: 'csharp', name: 'C#', cat: '言語', aliases: ['c#', 'csharp', 'c sharp'], demand: 70, growth: 1, hours: 140 },
  { id: 'cpp', name: 'C++', cat: '言語', aliases: ['c++', 'cpp'], demand: 60, growth: 0, hours: 220 },
  { id: 'c', name: 'C', cat: '言語', aliases: ['c言語'], demand: 52, growth: -3, hours: 160 },
  { id: 'php', name: 'PHP', cat: '言語', aliases: [], demand: 64, growth: -6, hours: 100 },
  { id: 'ruby', name: 'Ruby', cat: '言語', aliases: [], demand: 60, growth: -4, hours: 100 },
  { id: 'scala', name: 'Scala', cat: '言語', aliases: [], demand: 38, growth: -5, hours: 180 },
  { id: 'sql', name: 'SQL', cat: '言語', aliases: [], demand: 90, growth: 3, hours: 60 },
  { id: 'cobol', name: 'COBOL', cat: '言語', aliases: [], demand: 30, growth: -8, hours: 120 },
  { id: 'abap', name: 'ABAP', cat: '言語', aliases: [], demand: 35, growth: -2, hours: 140 },
  { id: 'dart', name: 'Dart', cat: '言語', aliases: [], demand: 40, growth: 6, hours: 80 },
  // フロントエンド
  { id: 'react', name: 'React', cat: 'フロントエンド', aliases: ['react.js', 'reactjs'], demand: 90, growth: 8, hours: 100 },
  { id: 'nextjs', name: 'Next.js', cat: 'フロントエンド', aliases: ['next.js', 'nextjs'], demand: 78, growth: 18, hours: 60 },
  { id: 'vue', name: 'Vue.js', cat: 'フロントエンド', aliases: ['vue', 'vuejs', 'nuxt', 'nuxt.js'], demand: 72, growth: 0, hours: 80 },
  { id: 'angular', name: 'Angular', cat: 'フロントエンド', aliases: [], demand: 45, growth: -6, hours: 120 },
  { id: 'html_css', name: 'HTML/CSS', cat: 'フロントエンド', aliases: ['html', 'css', 'html5', 'css3', 'sass', 'scss', 'tailwind'], demand: 80, growth: 0, hours: 60 },
  { id: 'flutter', name: 'Flutter', cat: 'モバイル', aliases: [], demand: 55, growth: 9, hours: 100 },
  { id: 'react_native', name: 'React Native', cat: 'モバイル', aliases: ['react-native'], demand: 50, growth: 3, hours: 80 },
  { id: 'ios', name: 'iOS開発', cat: 'モバイル', aliases: ['ios', 'swiftui', 'uikit'], demand: 60, growth: 2, hours: 160 },
  { id: 'android', name: 'Android開発', cat: 'モバイル', aliases: ['android', 'jetpack compose'], demand: 60, growth: 2, hours: 160 },
  // バックエンド
  { id: 'nodejs', name: 'Node.js', cat: 'バックエンド', aliases: ['node', 'node.js', 'express', 'nestjs'], demand: 82, growth: 6, hours: 80 },
  { id: 'spring', name: 'Spring Boot', cat: 'バックエンド', aliases: ['spring', 'spring boot', 'springboot'], demand: 74, growth: 1, hours: 120 },
  { id: 'django', name: 'Django', cat: 'バックエンド', aliases: ['fastapi', 'flask'], demand: 64, growth: 7, hours: 80 },
  { id: 'rails', name: 'Ruby on Rails', cat: 'バックエンド', aliases: ['rails', 'ruby on rails', 'ror'], demand: 56, growth: -5, hours: 100 },
  { id: 'laravel', name: 'Laravel', cat: 'バックエンド', aliases: [], demand: 50, growth: -3, hours: 80 },
  { id: 'dotnet', name: '.NET', cat: 'バックエンド', aliases: ['.net', 'asp.net', 'dotnet'], demand: 60, growth: 0, hours: 120 },
  { id: 'graphql', name: 'GraphQL', cat: 'バックエンド', aliases: [], demand: 55, growth: 6, hours: 40 },
  { id: 'microservices', name: 'マイクロサービス', cat: 'アーキテクチャ', aliases: ['microservices', 'マイクロサービス', 'ddd', 'ドメイン駆動設計'], demand: 74, growth: 8, hours: 120 },
  { id: 'api_design', name: 'API設計', cat: 'アーキテクチャ', aliases: ['rest', 'restful', 'openapi', 'grpc', 'api設計'], demand: 80, growth: 4, hours: 50 },
  // データベース
  { id: 'mysql', name: 'MySQL', cat: 'データベース', aliases: ['mariadb'], demand: 76, growth: 0, hours: 50 },
  { id: 'postgresql', name: 'PostgreSQL', cat: 'データベース', aliases: ['postgres', 'postgresql'], demand: 78, growth: 7, hours: 50 },
  { id: 'oracle', name: 'Oracle DB', cat: 'データベース', aliases: ['oracle', 'pl/sql'], demand: 55, growth: -4, hours: 80 },
  { id: 'redis', name: 'Redis', cat: 'データベース', aliases: [], demand: 62, growth: 4, hours: 20 },
  { id: 'mongodb', name: 'MongoDB', cat: 'データベース', aliases: ['mongo', 'nosql', 'dynamodb'], demand: 55, growth: 2, hours: 40 },
  // クラウド・インフラ
  { id: 'aws', name: 'AWS', cat: 'クラウド', aliases: ['amazon web services', 'ec2', 's3', 'lambda'], demand: 94, growth: 9, hours: 150 },
  { id: 'gcp', name: 'Google Cloud', cat: 'クラウド', aliases: ['gcp', 'google cloud', 'bigquery'], demand: 70, growth: 12, hours: 150 },
  { id: 'azure', name: 'Azure', cat: 'クラウド', aliases: ['microsoft azure'], demand: 72, growth: 10, hours: 150 },
  { id: 'docker', name: 'Docker', cat: 'インフラ', aliases: ['コンテナ', 'container'], demand: 86, growth: 6, hours: 40 },
  { id: 'kubernetes', name: 'Kubernetes', cat: 'インフラ', aliases: ['k8s', 'eks', 'gke', 'aks'], demand: 82, growth: 13, hours: 120 },
  { id: 'terraform', name: 'Terraform', cat: 'インフラ', aliases: ['iac', 'cloudformation', 'pulumi'], demand: 76, growth: 14, hours: 60 },
  { id: 'linux', name: 'Linux', cat: 'インフラ', aliases: ['unix', 'centos', 'ubuntu', 'rhel', 'シェル', 'bash', 'shell'], demand: 80, growth: 1, hours: 80 },
  { id: 'network', name: 'ネットワーク', cat: 'インフラ', aliases: ['tcp/ip', 'ccna', 'ccnp', 'cisco', 'ネットワーク設計', 'lan', 'vpn'], demand: 66, growth: 0, hours: 120 },
  { id: 'cicd', name: 'CI/CD', cat: 'DevOps', aliases: ['ci/cd', 'github actions', 'jenkins', 'gitlab ci', 'circleci', 'argocd'], demand: 84, growth: 9, hours: 40 },
  { id: 'git', name: 'Git', cat: 'DevOps', aliases: ['github', 'gitlab'], demand: 88, growth: 1, hours: 20 },
  { id: 'observability', name: '監視・可観測性', cat: 'DevOps', aliases: ['datadog', 'prometheus', 'grafana', 'new relic', 'opentelemetry', '監視'], demand: 68, growth: 12, hours: 50 },
  { id: 'sre', name: 'SRE', cat: 'DevOps', aliases: ['site reliability', 'slo', 'sli'], demand: 72, growth: 11, hours: 120 },
  // データ・AI
  { id: 'ml', name: '機械学習', cat: 'データ/AI', aliases: ['machine learning', 'scikit-learn', 'sklearn', '機械学習', 'ml'], demand: 82, growth: 15, hours: 200 },
  { id: 'deep_learning', name: 'ディープラーニング', cat: 'データ/AI', aliases: ['deep learning', 'pytorch', 'tensorflow', 'keras', '深層学習'], demand: 74, growth: 14, hours: 200 },
  { id: 'llm', name: '生成AI/LLM', cat: 'データ/AI', aliases: ['llm', '生成ai', 'chatgpt', 'claude', 'rag', 'langchain', 'プロンプトエンジニアリング', 'generative ai'], demand: 90, growth: 45, hours: 80 },
  { id: 'data_eng', name: 'データエンジニアリング', cat: 'データ/AI', aliases: ['etl', 'spark', 'airflow', 'dbt', 'snowflake', 'databricks', 'データ基盤'], demand: 78, growth: 13, hours: 150 },
  { id: 'data_analysis', name: 'データ分析', cat: 'データ/AI', aliases: ['pandas', 'tableau', 'power bi', 'looker', '統計', 'bi'], demand: 75, growth: 6, hours: 100 },
  { id: 'mlops', name: 'MLOps', cat: 'データ/AI', aliases: ['mlflow', 'sagemaker', 'vertex ai'], demand: 62, growth: 20, hours: 100 },
  // セキュリティ
  { id: 'security', name: 'セキュリティ', cat: 'セキュリティ', aliases: ['情報セキュリティ', 'cissp', '脆弱性診断', 'owasp', 'siem', 'soc', 'ゼロトラスト'], demand: 78, growth: 12, hours: 160 },
  { id: 'cloud_security', name: 'クラウドセキュリティ', cat: 'セキュリティ', aliases: ['iam', 'cspm'], demand: 66, growth: 16, hours: 100 },
  // 業務・その他
  { id: 'sap', name: 'SAP', cat: '業務システム', aliases: ['sap s/4hana', 's/4hana', 'erp'], demand: 58, growth: 4, hours: 200 },
  { id: 'salesforce', name: 'Salesforce', cat: '業務システム', aliases: ['sfdc'], demand: 60, growth: 5, hours: 120 },
  { id: 'embedded', name: '組込み開発', cat: '組込み', aliases: ['組み込み', '組込み', 'rtos', 'マイコン', 'embedded', 'autosar'], demand: 55, growth: 2, hours: 200 },
  { id: 'testing', name: 'テスト自動化', cat: '品質', aliases: ['selenium', 'playwright', 'cypress', 'jest', 'pytest', 'テスト自動化', 'qa'], demand: 70, growth: 7, hours: 60 },
  { id: 'agile', name: 'アジャイル/スクラム', cat: 'マネジメント', aliases: ['agile', 'scrum', 'スクラム', 'アジャイル', 'kanban', 'csm', 'pspo'], demand: 74, growth: 4, hours: 40 },
  { id: 'pm', name: 'プロジェクトマネジメント', cat: 'マネジメント', aliases: ['pmp', 'pmo', 'プロジェクト管理', 'プロジェクトマネジメント', 'wbs', 'プロジェクトマネージャー'], demand: 76, growth: 3, hours: 150 },
  { id: 'product', name: 'プロダクトマネジメント', cat: 'マネジメント', aliases: ['product management', 'プロダクトマネージャー', 'pdm', 'ロードマップ'], demand: 70, growth: 8, hours: 150 },
  { id: 'team_lead', name: 'チームリード', cat: 'マネジメント', aliases: ['リーダー', 'マネージャー', 'テックリード', 'tech lead', 'メンバー育成', 'マネジメント'], demand: 72, growth: 3, hours: 100 },
  { id: 'requirements', name: '要件定義', cat: '上流工程', aliases: ['要件定義', '基本設計', '上流工程', '要求分析', 'rfp'], demand: 74, growth: 2, hours: 100 },
  { id: 'uiux', name: 'UI/UXデザイン', cat: 'デザイン', aliases: ['figma', 'ux', 'ui', 'ユーザー調査', 'プロトタイピング'], demand: 64, growth: 6, hours: 120 },
  { id: 'english', name: 'ビジネス英語', cat: '語学', aliases: ['english', '英語', 'toeic', 'toefl', 'ielts'], demand: 68, growth: 5, hours: 300 },
  { id: 'japanese', name: 'ビジネス日本語', cat: '語学', aliases: ['jlpt', 'n1', 'n2', '日本語'], demand: 70, growth: 2, hours: 400 },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

// 学習リソースはカテゴリ単位で提示する（個別の有料講座を断定しないため一般名で記載）。
export const LEARNING_PATHS = {
  言語: ['公式ドキュメント／チュートリアルを一周', '小さなCLIツールやAPIを自作してGitHubで公開', 'OSSのIssueに1件コントリビュート'],
  フロントエンド: ['公式チュートリアルでTODOアプリを作成', '既存サービスのUIを模写してデプロイ', 'Lighthouseでパフォーマンス改善を経験'],
  モバイル: ['公式サンプルアプリを改造', '個人アプリをストアに公開', 'CI でのビルド・配布を自動化'],
  バックエンド: ['認証付きREST APIを実装', 'テスト・Docker化・CIまで整備', '負荷試験で性能改善を体験'],
  アーキテクチャ: ['設計書（ADR）を書く習慣をつける', '既存システムの構成図を描き改善案を出す', '設計レビューに参加する'],
  データベース: ['正規化・インデックス設計を演習', '実行計画を読みスロークエリを改善', 'レプリケーション/バックアップを構築'],
  クラウド: ['無料枠で3層構成を構築', 'アソシエイトレベルの認定資格を取得', 'コスト最適化レポートを作成'],
  インフラ: ['ローカル環境で構築→IaC化', '障害対応手順書（Runbook）を作成', '資格（LPIC/CCNA等）で体系化'],
  DevOps: ['個人リポジトリにCI/CDを導入', 'デプロイ自動化とロールバックを体験', 'SLO を定義しダッシュボード化'],
  'データ/AI': ['Kaggle等の公開データで分析ノートを作成', '生成AIを使ったRAGアプリを試作', 'モデルの評価指標とデプロイまで実施'],
  セキュリティ: ['OWASP Top 10 を一通り理解', '脆弱性診断ツールを検証環境で試す', '情報処理安全確保支援士などの資格学習'],
  業務システム: ['トライアル環境で標準機能を触る', '業務フロー（販売・会計等）を図解', '認定資格の取得'],
  組込み: ['評価ボードでLチカ→センサー制御', 'RTOSのタスク設計を学ぶ', '品質規格（ISO 26262等）の概要把握'],
  品質: ['既存プロジェクトにE2Eテストを追加', 'テスト設計技法（境界値・デシジョンテーブル）', 'JSTQB の学習'],
  マネジメント: ['小規模プロジェクトのリードに手を挙げる', 'ふりかえり・1on1 を主催', 'PMP／スクラム認定の学習'],
  上流工程: ['要件定義書のテンプレートで模擬作成', '業務ヒアリングに同席', '非機能要件チェックリストを活用'],
  デザイン: ['Figmaで既存アプリを再設計', 'ユーザーインタビューを3件実施', 'デザインシステムを読む'],
  語学: ['技術ドキュメントを原文で読む', 'オンライン英会話/日本語会話を週3回', '技術ブログを対象言語で執筆'],
};

const ALIAS_INDEX = (() => {
  const idx = [];
  for (const s of SKILLS) {
    const names = new Set([s.name.toLowerCase(), s.id.replace(/_/g, ' '), ...s.aliases.map((a) => a.toLowerCase())]);
    for (const n of names) idx.push([n, s.id]);
  }
  // 長い表記から先に照合し、"java" が "javascript" に誤一致しないようにする
  return idx.sort((a, b) => b[0].length - a[0].length);
})();

const ASCII_WORD = /^[a-z0-9.+#/\- ]+$/;

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** テキストから既知スキルIDの集合を返す。 */
export function detectSkills(text) {
  const lower = ` ${String(text || '').toLowerCase()} `;
  const found = new Set();
  let masked = lower;
  for (const [alias, id] of ALIAS_INDEX) {
    if (alias.length < 2 && alias !== 'c') continue;
    let re;
    if (ASCII_WORD.test(alias)) {
      // 英数字の表記は単語境界で判定（"go" が "google" に一致しないように）
      re = new RegExp(`(^|[^a-z0-9+#.])${escapeRe(alias)}(?![a-z0-9+#])`, 'g');
    } else {
      re = new RegExp(escapeRe(alias), 'g');
    }
    if (re.test(masked)) {
      // 単独の "c" / "go" は誤検出が多いので文脈がある場合のみ採用
      if (alias === 'c' && !/(^|[^a-z])c(言語|\/c\+\+| language)/.test(lower)) continue;
      if (alias === 'go' && !/(golang|go言語|go\s*\(|\bgo\s*[,、/]|[,、/]\s*go\b|\bgo\s+\d|言語.*\bgo\b|\bgo\b.*言語)/.test(lower)) continue;
      found.add(id);
      masked = masked.replace(re, '$1 ');
    }
  }
  return [...found];
}

export function skillName(id) {
  return SKILL_BY_ID[id]?.name || id;
}
