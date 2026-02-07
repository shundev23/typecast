import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
// アイコン
import { Sparkles, Loader2, Brain, Lightbulb, LogIn, User as UserIcon, Share2, Ban, X, Info, Moon, Sun, Languages } from 'lucide-react';
// Firebase Auth (認証)
import { signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
// チャートコンポーネント
import { MoodChart } from './components/MoodChart';
// Pages
import { MyPage } from './pages/MyPage';
// Services
import { historyService } from './services/history';
import { recommendService } from './services/recommend';
import { shareService } from './services/share';
// Types & Utils
import type { Movie, HistoryItem } from './types';
import toast from 'react-hot-toast';
import { ApiError } from './lib/apiClient';
import { t, tf, mbtiLabel, type Lang } from './i18n';

// cooldownUntil をフォーマット（APIは RFC3339 形式で返す）
function formatCooldownUntil(until: string | Date | undefined, lang: Lang): string {
  if (!until) return '';
  const d = typeof until === 'string' ? new Date(until) : until;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: lang === 'ja' ? 'short' : undefined,
  });
}

// APIエラーからユーザー向けメッセージを取得
function getApiErrorMessage(error: unknown, lang: Lang): string {
  if (error instanceof ApiError) {
    const data = error.data as { code?: string; error?: string; cooldownUntil?: string } | null;
    if (data?.code === 'account_deleted_cooldown') {
      const untilStr = formatCooldownUntil(data.cooldownUntil, lang);
      return untilStr
        ? `${t(lang, 'accountDeletedCooldown')}\n${tf(lang, 'accountDeletedCooldownUntil', { until: untilStr })}`
        : t(lang, 'accountDeletedCooldown');
    }
    if (typeof data?.error === 'string') return data.error;
  }
  return t(lang, 'genericError');
}

// APIエラーをトーストで表示
function showApiErrorToast(error: unknown, lang: Lang, fallback?: string): void {
  const msg = getApiErrorMessage(error, lang);
  toast.error(fallback && msg === t(lang, 'genericError') ? fallback : msg);
}

// スコアから感情ラベルを取得（フィルタ用）
function getSentimentLabel(score: number, lang: Lang): string {
  if (score >= 3) return lang === 'ja' ? '非常にポジティブ・高揚状態' : 'Very Positive';
  if (score >= 1) return lang === 'ja' ? 'ポジティブ・安定的' : 'Positive';
  if (score === 0) return lang === 'ja' ? 'ニュートラル・平常心' : 'Neutral';
  if (score >= -2) return lang === 'ja' ? 'ネガティブ・疲労気味' : 'Negative';
  return lang === 'ja' ? '非常にネガティブ・要休息' : 'Very Negative';
}

function App() {
  // --- State管理 ---
  const [mbti, setMbti] = useState('INTP');
  const [mood, setMood] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [lang, setLang] = useState<Lang>('ja');
  const [darkMode, setDarkMode] = useState(false);
  const [usage, setUsage] = useState<{ limit: number; count: number; remaining: number } | null>(null);
  const [showGeminiQuotaModal, setShowGeminiQuotaModal] = useState(false);
  
  // チャート用データ
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const currentYear = new Date().getFullYear();

  // --- 0. 言語・テーマの復元（localStorage） ---
  useEffect(() => {
    const savedLang = localStorage.getItem('typecast_lang');
    if (savedLang === 'ja' || savedLang === 'en') setLang(savedLang);

    const savedTheme = localStorage.getItem('typecast_theme');
    const isDark = savedTheme === 'dark';
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  useEffect(() => {
    localStorage.setItem('typecast_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('typecast_theme', darkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // --- 1. リダイレクト戻り & ログイン状態の監視 ---
  useEffect(() => {
    let cancelled = false;

    // リダイレクト結果を先に処理
    getRedirectResult(auth)
      .then((cred) => {
        if (cancelled) return;
        if (cred?.user) {
          console.log('Redirect sign-in success:', cred.user.uid);
          setUser(cred.user);
        } else {
          console.log('No redirect result');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Redirect sign-in error:', err);
        // エラーの詳細をユーザーに表示
        if (err.code === 'auth/unauthorized-domain') {
          toast.error(t(lang, 'authDomainError') || 'このドメインは認証が許可されていません。管理者に連絡してください。');
        } else if (err.code === 'auth/popup-blocked') {
          toast.error(t(lang, 'popupBlockedError') || 'ポップアップがブロックされました。ブラウザの設定を確認してください。');
        } else {
          toast.error(t(lang, 'loginError') || 'ログインに失敗しました。もう一度お試しください。');
        }
      });

    // 認証状態の変更を監視
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!cancelled) {
        console.log('Auth state changed:', currentUser?.uid || 'null');
        setUser(currentUser);
      }
    });
    
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // --- 2. ログイン時に履歴データをAPIから取得 ---
  useEffect(() => {
    if (!user) {
      setHistoryData([]);
      return;
    }

   const fetchHistory = async () => {
      try {
        const token = await user.getIdToken();
        const items = await historyService.fetchAll(token);
        setHistoryData(items);
      } catch (error) {
        console.error("Failed to fetch history:", error);
        // 履歴取得失敗は静かに処理（空配列のまま）
        // エラートーストは映画推薦時のみ表示
      }
    };

    fetchHistory();
  }, [user]);

  // --- ハンドラー関数 ---

  const handleLogin = async () => {
    try {
      console.log('Login attempt started, DEV mode:', import.meta.env.DEV);
      if (import.meta.env.DEV) {
        const result = await signInWithPopup(auth, googleProvider);
        console.log('Popup sign-in success:', result.user.uid);
      } else {
        console.log('Starting redirect sign-in...');
        await signInWithRedirect(auth, googleProvider);
        // リダイレクトが開始されるため、この後のコードは実行されない
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error(t(lang, 'loginCancelled') || 'ログインがキャンセルされました。');
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error(t(lang, 'authDomainError') || 'このドメインは認証が許可されていません。管理者に連絡してください。');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error(t(lang, 'popupBlockedError') || 'ポップアップがブロックされました。ブラウザの設定を確認してください。');
      } else {
        toast.error(t(lang, 'loginError') || 'ログインに失敗しました。もう一度お試しください。');
      }
    }
  };

  const handleRecommend = async () => {
    if (!mood) return;

    if (!user) {
        toast.error(t(lang, 'loginRequired'));
        return;
    }

    setLoading(true);
    setMovies([]);
    setShowLimitModal(false);
    setShowGeminiQuotaModal(false);

    try {
      const token = await user.getIdToken();
      const ignoreMovies = historyData.map(item => item.title);
      
      // ★ Service経由で実行 (res.status などの判定は不要、失敗ならcatchへ飛ぶ)
      const data = await recommendService.analyze(mbti, mood, ignoreMovies, token);

      setMovies(data.movies);
      if (typeof data.limit === 'number' && typeof data.count === 'number' && typeof data.remaining === 'number') {
        setUsage({ limit: data.limit, count: data.count, remaining: data.remaining });
      }

      // API経由で履歴を保存
      if (data.movies.length > 0) {
        const sentimentLabel = getSentimentLabel(data.sentiment_score, lang);
        await historyService.save({
          movies: data.movies.map(m => ({
            title: m.title,
            year: m.year,
            poster: m.poster,
            reason_main: m.reason_main,
            reason_sub: m.reason_sub,
            label_main: m.label_main,
            label_sub: m.label_sub,
            providers: m.providers
          })),
          mood: mood,
          score: data.sentiment_score,
          sentiment_label: sentimentLabel
        }, token);

        // チャート即時更新用（再フェッチせずにstateに追加）
        const now = new Date();
        setHistoryData(prev => [
          ...prev,
          ...data.movies.map(m => ({
            title: m.title,
            year: m.year,
            poster: m.poster,
            reason_main: m.reason_main,
            reason_sub: m.reason_sub,
            label_main: m.label_main,
            label_sub: m.label_sub,
            providers: m.providers,
            timestamp: now,
            score: data.sentiment_score,
            mood: mood,
            sentiment_label: sentimentLabel
          }))
        ]);
      }

    } catch (error) {
      console.error("Error:", error);

      // ★ ApiErrorをキャッチして 429 (レートリミット) を判定
      if (error instanceof ApiError && error.status === 429) {
        const data = error.data as { code?: string; limit?: number; count?: number; remaining?: number; error?: string } | null;
        if (data?.code === 'daily_limit') {
          if (typeof data.limit === 'number' && typeof data.count === 'number' && typeof data.remaining === 'number') {
            setUsage({ limit: data.limit, count: data.count, remaining: data.remaining });
          }
          setShowLimitModal(true);
          return;
        }
        if (data?.code === 'gemini_quota') {
          setShowGeminiQuotaModal(true);
          return;
        }
        // 互換: code が無い 429 は従来通り limit モーダル
        setShowLimitModal(true);
        return;
      }

      showApiErrorToast(error, lang);
    } finally {
      setLoading(false);
    }
  };

  // シェア機能の実装
  const handleShare = async () => {
    if (movies.length === 0) return;
    
    // 直近の結果を取得
    const movie = movies[0];
    const latestScore = historyData[historyData.length - 1]?.score ?? 0;
    
    try {
      // ★ Service経由で実行
      const data = await shareService.createLink(movie.title, mood, latestScore);
      const shareUrl = data.share_url;

      const text = `🎬 TYPECAST Analysis Result\n\n👤 Type: ${mbti}\n🧠 Mood: "${mood}"\n\n#TYPECAST`;
      const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
      
      window.open(xUrl, '_blank');

    } catch (error) {
      console.error("Share Error:", error);
      showApiErrorToast(error, lang, t(lang, 'shareFailed'));
    }
  };

  return (
    <Routes>
      <Route path="/" element={<HomePage 
        user={user}
        lang={lang}
        setLang={setLang}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        mbti={mbti}
        setMbti={setMbti}
        mood={mood}
        setMood={setMood}
        movies={movies}
        loading={loading}
        usage={usage}
        showLimitModal={showLimitModal}
        setShowLimitModal={setShowLimitModal}
        showAboutModal={showAboutModal}
        setShowAboutModal={setShowAboutModal}
        showGeminiQuotaModal={showGeminiQuotaModal}
        setShowGeminiQuotaModal={setShowGeminiQuotaModal}
        historyData={historyData}
        currentYear={currentYear}
        handleLogin={handleLogin}
        handleRecommend={handleRecommend}
        handleShare={handleShare}
      />} />
      <Route path="/mypage" element={
        user ? (
          <MyPage 
            user={user}
            lang={lang}
            setLang={setLang}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        ) : (
          <div className="min-h-screen bg-typecast-bg flex items-center justify-center">
            <p className="text-typecast-muted">{t(lang, 'loginRequired')}</p>
          </div>
        )
      } />
    </Routes>
  );
}

interface HomePageProps {
  user: User | null;
  lang: Lang;
  setLang: (lang: Lang) => void;
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
  mbti: string;
  setMbti: (mbti: string) => void;
  mood: string;
  setMood: (mood: string) => void;
  movies: Movie[];
  loading: boolean;
  usage: { limit: number; count: number; remaining: number } | null;
  showLimitModal: boolean;
  setShowLimitModal: (show: boolean) => void;
  showAboutModal: boolean;
  setShowAboutModal: (show: boolean) => void;
  showGeminiQuotaModal: boolean;
  setShowGeminiQuotaModal: (show: boolean) => void;
  historyData: HistoryItem[];
  currentYear: number;
  handleLogin: () => Promise<void>;
  handleRecommend: () => Promise<void>;
  handleShare: () => Promise<void>;
}

function HomePage({
  user,
  lang,
  setLang,
  darkMode,
  setDarkMode,
  mbti,
  setMbti,
  mood,
  setMood,
  movies,
  loading,
  usage,
  showLimitModal,
  setShowLimitModal,
  showAboutModal,
  setShowAboutModal,
  showGeminiQuotaModal,
  setShowGeminiQuotaModal,
  historyData,
  currentYear,
  handleLogin,
  handleRecommend,
  handleShare,
}: HomePageProps) {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-typecast-bg text-typecast-text flex flex-col">
      {/* ヘッダー: シンプル・余白を活かした Airbnb 風 */}
      <header className="border-b border-typecast-border bg-typecast-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Typecast Logo" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-typecast-text">TYPECAST</h1>
              <p className="text-xs text-typecast-muted hidden sm:block">MBTI Logic-Based Cinema Recommender</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 言語切替 */}
            <button
              onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border border-typecast-border text-sm text-typecast-muted hover:text-typecast-text hover:bg-typecast-bg transition-colors"
              aria-label="Language"
            >
              <Languages className="w-4 h-4" />
              <span className="font-medium">{lang === 'ja' ? '日本語' : 'EN'}</span>
            </button>

            {/* ダークモード切替 */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border border-typecast-border text-sm text-typecast-muted hover:text-typecast-text hover:bg-typecast-bg transition-colors"
              aria-label="Theme"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="font-medium">{darkMode ? 'Light' : 'Dark'}</span>
            </button>
            {user ? (
              <button
                onClick={() => navigate('/mypage')}
                className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-typecast-bg transition-colors"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-9 h-9 rounded-full border border-typecast-border" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-typecast-border flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-typecast-muted" />
                  </div>
                )}
                <span className="text-sm font-medium text-typecast-text hidden md:block max-w-[140px] truncate">
                  {user.displayName || user.email}
                </span>
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="hidden md:flex items-center gap-2 bg-typecast-accent hover:bg-typecast-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-typecast"
              >
                <LogIn className="w-4 h-4" />
                <span>{t(lang, 'login')}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* スマホ用: 言語/テーマ とログイン案内 */}
      <div className="md:hidden px-4 py-4 border-b border-typecast-border bg-typecast-surface">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-typecast-border text-sm text-typecast-muted hover:text-typecast-text hover:bg-typecast-bg transition-colors"
          >
            <Languages className="w-4 h-4" />
            {lang === 'ja' ? '日本語' : 'English'}
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-typecast-border text-sm text-typecast-muted hover:text-typecast-text hover:bg-typecast-bg transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {darkMode ? 'Light' : 'Dark'}
          </button>
        </div>
        {!user && (
          <button onClick={handleLogin} className="mt-3 w-full flex items-center justify-center gap-2 bg-typecast-accent hover:bg-typecast-accent-hover text-white py-3 rounded-lg font-medium">
            <LogIn className="w-4 h-4" />
            {t(lang, 'loginWithGoogle')}
          </button>
        )}
      </div>

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 flex-1">
        {/* 感情分析チャート (データがあるときだけ表示) */}
        {user && historyData.length > 0 && (
          <div className="mb-8">
            <MoodChart data={historyData} lang={lang} />
          </div>
        )}

        {/* 入力フォーム: カード型・余白を活かしたデザイン */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-typecast-surface rounded-2xl border border-typecast-border shadow-typecast overflow-hidden">
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="sm:w-1/3">
                  <label className="block text-sm font-medium text-typecast-text mb-2">{t(lang, 'mbtiType')}</label>
                  <select
                    value={mbti}
                    onChange={(e) => setMbti(e.target.value)}
                    className="w-full bg-typecast-bg border border-typecast-border rounded-lg px-4 py-3 text-sm text-typecast-text focus:border-typecast-accent focus:ring-2 focus:ring-typecast-accent/20 outline-none transition-all"
                  >
                    <optgroup label={t(lang, 'mbtiGroupAnalysts')}>
                      <option value="INTJ">INTJ ({mbtiLabel(lang, 'INTJ')})</option>
                      <option value="INTP">INTP ({mbtiLabel(lang, 'INTP')})</option>
                      <option value="ENTJ">ENTJ ({mbtiLabel(lang, 'ENTJ')})</option>
                      <option value="ENTP">ENTP ({mbtiLabel(lang, 'ENTP')})</option>
                    </optgroup>
                    <optgroup label={t(lang, 'mbtiGroupDiplomats')}>
                      <option value="INFJ">INFJ ({mbtiLabel(lang, 'INFJ')})</option>
                      <option value="INFP">INFP ({mbtiLabel(lang, 'INFP')})</option>
                      <option value="ENFJ">ENFJ ({mbtiLabel(lang, 'ENFJ')})</option>
                      <option value="ENFP">ENFP ({mbtiLabel(lang, 'ENFP')})</option>
                    </optgroup>
                    <optgroup label={t(lang, 'mbtiGroupSentinels')}>
                      <option value="ISTJ">ISTJ ({mbtiLabel(lang, 'ISTJ')})</option>
                      <option value="ISFJ">ISFJ ({mbtiLabel(lang, 'ISFJ')})</option>
                      <option value="ESTJ">ESTJ ({mbtiLabel(lang, 'ESTJ')})</option>
                      <option value="ESFJ">ESFJ ({mbtiLabel(lang, 'ESFJ')})</option>
                    </optgroup>
                    <optgroup label={t(lang, 'mbtiGroupExplorers')}>
                      <option value="ISTP">ISTP ({mbtiLabel(lang, 'ISTP')})</option>
                      <option value="ISFP">ISFP ({mbtiLabel(lang, 'ISFP')})</option>
                      <option value="ESTP">ESTP ({mbtiLabel(lang, 'ESTP')})</option>
                      <option value="ESFP">ESFP ({mbtiLabel(lang, 'ESFP')})</option>
                    </optgroup>
                  </select>
                </div>
                <div className="sm:flex-1">
                  <label className="block text-sm font-medium text-typecast-text mb-2">{t(lang, 'mood')}</label>
                  <textarea
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    placeholder={t(lang, 'moodPlaceholder')}
                    rows={3}
                    className="w-full bg-typecast-bg border border-typecast-border rounded-lg px-4 py-3 text-sm text-typecast-text placeholder-typecast-muted focus:border-typecast-accent focus:ring-2 focus:ring-typecast-accent/20 outline-none transition-all resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleRecommend();
                      }
                    }}
                  />
                </div>
              </div>
              <button
                onClick={handleRecommend}
                disabled={loading || !mood}
                className="w-full mt-6 bg-typecast-accent hover:bg-typecast-accent-hover disabled:bg-typecast-border disabled:text-typecast-muted text-white font-medium py-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                <span>{t(lang, 'analyzeRecommend')}</span>
              </button>

              {/* 日次制限の見える化（成功後に表示） */}
              {user && usage && (
                <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                  <div className="text-typecast-muted">
                    <span className="font-medium text-typecast-text">{tf(lang, 'remainingToday', { n: usage.remaining })}</span>
                    <span className="ml-2 text-xs">({usage.count}/{usage.limit})</span>
                  </div>
                  <div className="w-28 h-2 bg-typecast-border rounded-full overflow-hidden" aria-hidden>
                    <div
                      className="h-full bg-typecast-accent"
                      style={{ width: `${Math.min((usage.count / Math.max(usage.limit, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 感情スコア & シェア (結果があるとき) */}
        {movies.length > 0 && (
          <div className="mb-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="bg-typecast-surface rounded-xl border border-typecast-border shadow-typecast px-6 py-4 flex items-center gap-6">
              <div className="text-center border-r border-typecast-border pr-6">
                <p className="text-xs text-typecast-muted font-medium mb-1">{t(lang, 'sentimentScore')}</p>
                <p className={`text-2xl font-semibold ${
                  (historyData[historyData.length - 1]?.score ?? 0) > 0 ? 'text-typecast-accent' :
                  (historyData[historyData.length - 1]?.score ?? 0) < 0 ? 'text-red-500' : 'text-typecast-secondary'
                }`}>
                  {historyData[historyData.length - 1]?.score > 0 ? '+' : ''}
                  {historyData[historyData.length - 1]?.score}
                </p>
              </div>
              <div>
                <p className="text-xs text-typecast-muted font-medium mb-1">{t(lang, 'analysisResult')}</p>
                <p className="text-sm font-medium text-typecast-text">
                  {getSentimentLabel(historyData[historyData.length - 1]?.score ?? 0, lang)}
                </p>
              </div>
            </div>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-typecast-muted hover:text-typecast-accent border border-typecast-border hover:border-typecast-accent rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>{t(lang, 'shareOnX')}</span>
            </button>
          </div>
        )}

        {/* 映画カード: 画像重視・カード型 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {movies.map((movie, idx) => (
            <div key={idx} className="bg-typecast-surface rounded-2xl overflow-hidden border border-typecast-border shadow-typecast hover:shadow-typecast-lg transition-all group">
              <div className="relative aspect-[2/3] overflow-hidden">
                <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-16">
                  <h3 className="text-lg font-semibold text-white">{movie.title}</h3>
                  <span className="text-sm text-white/80">{movie.year}</span>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-typecast-accent text-xs font-medium">
                    <Brain className="w-3.5 h-3.5" />
                    <span>{movie.label_main}</span>
                  </div>
                  <p className="text-sm text-typecast-secondary leading-relaxed">{movie.reason_main}</p>
                </div>
                <div className="border-t border-typecast-border pt-3 space-y-2">
                  <div className="flex items-center gap-2 text-typecast-muted text-xs font-medium">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>{movie.label_sub}</span>
                  </div>
                  <p className="text-sm text-typecast-secondary leading-relaxed">{movie.reason_sub}</p>
                </div>
                {movie.providers && movie.providers.length > 0 && (
                  <div className="border-t border-typecast-border pt-3">
                    <p className="text-xs text-typecast-muted font-medium mb-2">{t(lang, 'availableInJP')}</p>
                    <div className="flex flex-wrap gap-2">
                      {movie.providers.map((provider, pIdx) => (
                        <a key={pIdx} href={provider.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                          <img src={provider.logo} alt={provider.name} title={provider.name} className="w-8 h-8 rounded-lg object-contain border border-typecast-border" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
      {/* レートリミットモーダル */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLimitModal(false)} />
          <div className="relative bg-typecast-surface rounded-2xl p-8 max-w-md w-full shadow-typecast-lg border border-typecast-border">
            <button onClick={() => setShowLimitModal(false)} className="absolute top-4 right-4 text-typecast-muted hover:text-typecast-text">
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
                <Ban className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-typecast-text mb-1">{t(lang, 'limitTitle')}</h2>
                <p className="text-sm text-typecast-muted">
                  {t(lang, 'limitSubtitle')}
                  {usage ? <span className="ml-2 text-xs">({usage.count}/{usage.limit})</span> : null}
                </p>
              </div>
              <div className="bg-typecast-bg rounded-lg p-4 text-left w-full">
                <p className="text-sm text-typecast-secondary leading-relaxed">
                  {t(lang, 'limitBody')}
                </p>
                <p className="mt-3 text-xs text-typecast-muted">{t(lang, 'limitNext')}</p>
              </div>
              <button onClick={() => setShowLimitModal(false)} className="w-full bg-typecast-accent hover:bg-typecast-accent-hover text-white font-medium py-3 rounded-lg">
                {t(lang, 'close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gemini 利用制限モーダル */}
      {showGeminiQuotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowGeminiQuotaModal(false)} />
          <div className="relative bg-typecast-surface rounded-2xl p-8 max-w-md w-full shadow-typecast-lg border border-typecast-border">
            <button onClick={() => setShowGeminiQuotaModal(false)} className="absolute top-4 right-4 text-typecast-muted hover:text-typecast-text">
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 bg-typecast-bg rounded-full flex items-center justify-center">
                <Ban className="w-7 h-7 text-typecast-accent" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-typecast-text mb-1">{t(lang, 'geminiQuotaTitle')}</h2>
                <p className="text-sm text-typecast-muted">{t(lang, 'geminiQuotaBody')}</p>
              </div>
              <button onClick={() => setShowGeminiQuotaModal(false)} className="w-full bg-typecast-accent hover:bg-typecast-accent-hover text-white font-medium py-3 rounded-lg">
                {t(lang, 'close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About モーダル */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAboutModal(false)} />
          <div className="relative bg-typecast-surface rounded-2xl p-8 max-w-lg w-full shadow-typecast-lg border border-typecast-border max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAboutModal(false)} className="absolute top-4 right-4 text-typecast-muted hover:text-typecast-text">
              <X className="w-5 h-5" />
            </button>
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3">
                <img src="/logo.png" alt="Logo" className="w-14 h-14 object-contain" />
                <h2 className="text-xl font-semibold text-typecast-text">{t(lang, 'aboutHeading')}</h2>
              </div>
              <div className="space-y-4 text-left bg-typecast-bg p-5 rounded-xl">
                <div className="space-y-2">
                  <h3 className="text-typecast-accent font-medium text-sm flex items-center gap-2">
                    <Brain className="w-4 h-4" /> {t(lang, 'aboutConceptTitle')}
                  </h3>
                  <p className="text-sm text-typecast-secondary leading-relaxed whitespace-pre-line">
                    {t(lang, 'aboutConceptBody')}
                  </p>
                </div>
                <div className="space-y-2 border-t border-typecast-border pt-4">
                  <h3 className="text-typecast-accent font-medium text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> {t(lang, 'aboutFeaturesTitle')}
                  </h3>
                  <ul className="text-sm text-typecast-secondary list-disc list-inside space-y-1">
                    <li>{t(lang, 'aboutFeature1')}</li>
                    <li>{t(lang, 'aboutFeature2')}</li>
                    <li>{t(lang, 'aboutFeature3')}</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-typecast-muted text-center">{t(lang, 'poweredBy')}</p>
            </div>
          </div>
        </div>
      )}

      {/* フッター */}
      <footer className="border-t border-typecast-border bg-typecast-surface mt-10 sm:mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Typecast Logo" className="w-8 h-8 object-contain" />
                <span className="font-semibold tracking-tight text-typecast-text">TYPECAST</span>
              </div>
              <p className="text-sm text-typecast-muted">{t(lang, 'tmdbDisclaimer')}</p>
            </div>

            <div className="grid grid-cols-2 gap-6 w-full md:w-auto">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-typecast-text">Info</p>
                <button
                  onClick={() => setShowAboutModal(true)}
                  className="flex items-center gap-2 text-sm text-typecast-muted hover:text-typecast-accent transition-colors"
                >
                  <Info className="w-4 h-4" />
                  {t(lang, 'aboutTitle')}
                </button>
                <a href="/terms.html" target="_blank" className="block text-sm text-typecast-muted hover:text-typecast-accent transition-colors">
                  {t(lang, 'termsPrivacy')}
                </a>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-typecast-text">Contact</p>
                <a href="mailto:hakuma1.one@gmail.com" className="block text-sm text-typecast-muted hover:text-typecast-accent transition-colors">
                  {t(lang, 'contact')}
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-typecast-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-typecast-muted">© {currentYear} Typecast. All rights reserved.</p>
            <div className="flex items-center gap-3 text-xs text-typecast-muted">
              <span>{lang === 'ja' ? '言語' : 'Language'}: {lang === 'ja' ? '日本語' : 'EN'}</span>
              <span>•</span>
              <span>{darkMode ? (lang === 'ja' ? 'ダーク' : 'Dark') : (lang === 'ja' ? 'ライト' : 'Light')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;