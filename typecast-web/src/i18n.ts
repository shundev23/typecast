export type Lang = 'ja' | 'en';

export type I18nKey =
  | 'login'
  | 'loginWithGoogle'
  | 'logout'
  | 'account'
  | 'mbtiType'
  | 'mood'
  | 'analyzeRecommend'
  | 'shareOnX'
  | 'analysisResult'
  | 'sentimentScore'
  | 'availableInJP'
  | 'feedback'
  | 'like'
  | 'dislike'
  | 'watched'
  | 'limitTitle'
  | 'limitSubtitle'
  | 'limitBody'
  | 'limitNext'
  | 'close'
  | 'aboutTitle'
  | 'aboutHeading'
  | 'aboutConceptTitle'
  | 'aboutConceptBody'
  | 'aboutFeaturesTitle'
  | 'aboutFeature1'
  | 'aboutFeature2'
  | 'aboutFeature3'
  | 'poweredBy'
  | 'termsPrivacy'
  | 'contact'
  | 'tmdbDisclaimer'
  | 'loginRequired'
  | 'genericError'
  | 'shareFailed'
  | 'remainingToday'
  | 'geminiQuotaTitle'
  | 'geminiQuotaBody'
  | 'accountDelete'
  | 'accountDeleteTitle'
  | 'accountDeleteBody'
  | 'accountDeleteHint'
  | 'accountDeleteType'
  | 'accountDeleteConfirm'
  | 'accountDeleteCancel'
  | 'accountDeleteSuccess'
  | 'accountDeleteFailed'
  | 'accountDeleteDeletedTitle'
  | 'accountDeleteDeleted1'
  | 'accountDeleteDeleted2'
  | 'accountDeleteDeleted3'
  | 'accountDeleteDeleted4'
  | 'accountDeleteNotDeletedTitle'
  | 'accountDeleteNotDeleted1'
  | 'accountDeleteNotDeleted2'
  | 'accountDeleteAcknowledge'
  | 'feedbackSaved'
  | 'feedbackFailed';

const dict: Record<Lang, Record<I18nKey, string>> = {
  ja: {
    login: 'ログイン',
    loginWithGoogle: 'Google でログイン',
    logout: 'ログアウト',
    account: 'アカウント',
    mbtiType: 'MBTI タイプ',
    mood: '今の気分',
    analyzeRecommend: '分析して映画を提案',
    shareOnX: 'X でシェア',
    analysisResult: '分析結果',
    sentimentScore: 'Sentiment Score',
    availableInJP: '視聴可能 (日本)',
    feedback: 'フィードバック',
    like: '好き',
    dislike: '好みじゃない',
    watched: '視聴済み',
    limitTitle: '本日の上限に達しました',
    limitSubtitle: '1日3回まで',
    limitBody: '過度な情報の摂取は、決定麻痺（Analysis Paralysis）を引き起こす可能性があります。',
    limitNext: '次回利用可能: 明日 00:00 JST',
    close: '閉じる',
    aboutTitle: 'Typecastについて',
    aboutHeading: 'TYPECAST について',
    aboutConceptTitle: 'コンセプト',
    aboutConceptBody:
      '「検索疲れ」を終わらせるための、AI映画コンシェルジュです。\nあなたの MBTI（性格タイプ） と 今の気分 を分析し、論理的に最適な一作を提案します。',
    aboutFeaturesTitle: '特徴',
    aboutFeature1: 'Gemini 2.0 による心理機能ベースの分析',
    aboutFeature2: '気分に合わせた Sentiment Score',
    aboutFeature3: 'ネタバレなしの「観るべき理由」を解説',
    poweredBy: 'Powered by TMDB & Gemini API',
    termsPrivacy: '利用規約・プライバシー',
    contact: 'お問い合わせ',
    tmdbDisclaimer: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    loginRequired: 'ログインしてください',
    genericError: 'エラーが発生しました',
    shareFailed: 'シェアリンクの作成に失敗しました。',
    remainingToday: '本日は残り {{n}} 回です',
    geminiQuotaTitle: 'AIの利用制限に達しました',
    geminiQuotaBody: 'しばらく待ってから再試行するか、利用量を確認してください。',
    accountDelete: 'アカウント削除',
    accountDeleteTitle: 'アカウントを削除しますか？',
    accountDeleteBody: 'この操作は取り消せません。履歴・フィードバック・利用状況などが削除されます。',
    accountDeleteHint: '確認のため、下に DELETE と入力してください。',
    accountDeleteType: 'DELETE と入力',
    accountDeleteConfirm: '削除する',
    accountDeleteCancel: 'キャンセル',
    accountDeleteSuccess: 'アカウントを削除しました',
    accountDeleteFailed: 'アカウント削除に失敗しました',
    accountDeleteDeletedTitle: '削除されるもの',
    accountDeleteDeleted1: 'レコメンド履歴（users/{uid}/history）',
    accountDeleteDeleted2: 'フィードバック（users/{uid}/feedbacks）',
    accountDeleteDeleted3: '本日の残り回数・利用状況（users/{uid}）',
    accountDeleteDeleted4: 'ログイン情報（Firebase Authentication）',
    accountDeleteNotDeletedTitle: '削除されないもの',
    accountDeleteNotDeleted1: '過去に発行したシェアリンク（現状ユーザーと紐づかないため）',
    accountDeleteNotDeleted2: '端末に保存された設定（言語/テーマなど）は残ります',
    accountDeleteAcknowledge: '上記を理解し、取り消せないことに同意します',
    feedbackSaved: 'を記録しました！',
    feedbackFailed: '評価の送信に失敗しました',
  },
  en: {
    login: 'Log in',
    loginWithGoogle: 'Log in with Google',
    logout: 'Log out',
    account: 'Account',
    mbtiType: 'MBTI Type',
    mood: 'Mood',
    analyzeRecommend: 'Analyze & Recommend',
    shareOnX: 'Share on X',
    analysisResult: 'Analysis',
    sentimentScore: 'Sentiment Score',
    availableInJP: 'Available in Japan',
    feedback: 'Feedback',
    like: 'Like',
    dislike: "Not for me",
    watched: 'Watched',
    limitTitle: "Today's limit reached",
    limitSubtitle: 'Up to 3 per day',
    limitBody: 'Too much information can lead to analysis paralysis.',
    limitNext: 'Next available: Tomorrow 00:00 JST',
    close: 'Close',
    aboutTitle: 'About Typecast',
    aboutHeading: 'About TYPECAST',
    aboutConceptTitle: 'Concept',
    aboutConceptBody:
      'An AI movie concierge to end “search fatigue”.\nWe analyze your MBTI type and current mood, then recommend a logically fitting movie.',
    aboutFeaturesTitle: 'Highlights',
    aboutFeature1: 'Cognitive-function-based analysis powered by Gemini 2.0',
    aboutFeature2: 'Mood-based Sentiment Score',
    aboutFeature3: 'Spoiler-free explanations of “why this movie”',
    poweredBy: 'Powered by TMDB & Gemini API',
    termsPrivacy: 'Terms & Privacy',
    contact: 'Contact',
    tmdbDisclaimer: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    loginRequired: 'Please log in',
    genericError: 'An error occurred',
    shareFailed: 'Failed to create a share link.',
    remainingToday: '{{n}} recommendations left today',
    geminiQuotaTitle: 'AI quota reached',
    geminiQuotaBody: 'Please wait and try again later, or check your quota.',
    accountDelete: 'Delete account',
    accountDeleteTitle: 'Delete your account?',
    accountDeleteBody: 'This action cannot be undone. Your history, feedback, and usage data will be deleted.',
    accountDeleteHint: 'To confirm, type DELETE below.',
    accountDeleteType: 'Type DELETE',
    accountDeleteConfirm: 'Delete',
    accountDeleteCancel: 'Cancel',
    accountDeleteSuccess: 'Account deleted',
    accountDeleteFailed: 'Failed to delete account',
    accountDeleteDeletedTitle: 'What will be deleted',
    accountDeleteDeleted1: 'Recommendation history (users/{uid}/history)',
    accountDeleteDeleted2: 'Feedback (users/{uid}/feedbacks)',
    accountDeleteDeleted3: 'Daily usage / remaining count (users/{uid})',
    accountDeleteDeleted4: 'Sign-in account (Firebase Authentication)',
    accountDeleteNotDeletedTitle: 'What will NOT be deleted',
    accountDeleteNotDeleted1: 'Previously created share links (not tied to a user yet)',
    accountDeleteNotDeleted2: 'Device settings saved locally (language/theme) remain',
    accountDeleteAcknowledge: 'I understand and agree this cannot be undone',
    feedbackSaved: ' saved!',
    feedbackFailed: 'Failed to send feedback',
  },
};

export function t(lang: Lang, key: I18nKey): string {
  return dict[lang][key];
}

export function tf(lang: Lang, key: I18nKey, vars: Record<string, string | number>): string {
  let s = t(lang, key);
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{{${k}}}`, String(v));
  }
  return s;
}

