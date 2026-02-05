import { useState, useEffect } from 'react';
// アイコン
import { Sparkles, Loader2, Brain, Lightbulb, LogIn, LogOut, User as UserIcon, Share2, Ban, X, ThumbsUp, ThumbsDown, Eye, Info, Moon, Sun, Languages } from 'lucide-react';
// Firebase Auth (認証)
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
// チャートコンポーネント
import { MoodChart } from './components/MoodChart';
// Services
import { accountService } from './services/account';
import { feedbackService } from './services/feedback';
import { historyService } from './services/history';
import { recommendService } from './services/recommend';
import { shareService } from './services/share';
// Types & Utils
import type { Movie, HistoryItem } from './types';
import { ApiError } from './lib/apiClient';
import { t, tf, type Lang } from './i18n';

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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAcknowledge, setDeleteAcknowledge] = useState(false);
  
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

  // --- 1. ログイン状態の監視 ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
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
      }
    };

    fetchHistory();
  }, [user]);

  // --- ハンドラー関数 ---

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;

    setDeletingAccount(true);
    try {
      const token = await user.getIdToken();
      await accountService.deleteAccount(token, deleteConfirmText.trim());
      await signOut(auth);

      // UI state cleanup
      setMovies([]);
      setMood('');
      setHistoryData([]);
      setUsage(null);

      setShowDeleteAccountModal(false);
      setDeleteConfirmText('');
      alert(t(lang, 'accountDeleteSuccess'));
    } catch (error) {
      console.error('Delete account failed', error);
      alert(t(lang, 'accountDeleteFailed'));
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleRecommend = async () => {
    if (!mood) return;

    if (!user) {
        alert(t(lang, 'loginRequired'));
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
        await historyService.save({
          movies: data.movies.map(m => ({
             title: m.title,
             poster: m.poster
          })),
          mood: mood,
          score: data.sentiment_score
        }, token);

        // チャート即時更新用（再フェッチせずにstateに追加）
        setHistoryData(prev => [
            ...prev, 
            {
                title: data.movies[0].title,
                timestamp: new Date(),
                score: data.sentiment_score,
                mood: mood
            }
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
      
      alert(t(lang, 'genericError'));
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
      alert(t(lang, 'shareFailed'));
    }
  };

  // 評価ボタンを押したときの処理
  const handleFeedback = async (movieTitle: string, type: 'good' | 'bad' | 'watched') => {
    if (!user) {
      alert(t(lang, 'loginRequired'));
      return;
    }

    try {
      const token = await user.getIdToken();
      await feedbackService.sendFeedback(movieTitle, type, token);
      alert(`「${movieTitle}」${t(lang, 'feedbackSaved')}`);
    } catch (error) {
      console.error("Feedback Error:", error);
      alert(t(lang, 'feedbackFailed'));
    }
  };

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
              onClick={() => setLang((prev) => (prev === 'ja' ? 'en' : 'ja'))}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border border-typecast-border text-sm text-typecast-muted hover:text-typecast-text hover:bg-typecast-bg transition-colors"
              aria-label="Language"
            >
              <Languages className="w-4 h-4" />
              <span className="font-medium">{lang === 'ja' ? '日本語' : 'EN'}</span>
            </button>

            {/* ダークモード切替 */}
            <button
              onClick={() => setDarkMode((v) => !v)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border border-typecast-border text-sm text-typecast-muted hover:text-typecast-text hover:bg-typecast-bg transition-colors"
              aria-label="Theme"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="font-medium">{darkMode ? 'Light' : 'Dark'}</span>
            </button>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu((v) => !v)}
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
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-typecast-surface border border-typecast-border rounded-xl shadow-typecast z-40">
                    <div className="px-4 py-3 border-b border-typecast-border">
                      <p className="text-xs font-semibold text-typecast-muted">{t(lang, 'account')}</p>
                      <p className="mt-1 text-sm text-typecast-text truncate">{user.displayName || user.email}</p>
                      {user.email && (
                        <p className="text-xs text-typecast-muted truncate">{user.email}</p>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        setShowProfileMenu(false);
                        await handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-typecast-muted hover:text-typecast-text hover:bg-typecast-bg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t(lang, 'logout')}</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowDeleteAccountModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-typecast-bg transition-colors border-t border-typecast-border"
                    >
                      <Ban className="w-4 h-4" />
                      <span>{t(lang, 'accountDelete')}</span>
                    </button>
                  </div>
                )}
              </div>
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
            onClick={() => setLang((prev) => (prev === 'ja' ? 'en' : 'ja'))}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-typecast-border text-sm text-typecast-muted hover:text-typecast-text hover:bg-typecast-bg transition-colors"
          >
            <Languages className="w-4 h-4" />
            {lang === 'ja' ? '日本語' : 'English'}
          </button>
          <button
            onClick={() => setDarkMode((v) => !v)}
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
                    <optgroup label="Analysts (分析家)">
                      <option value="INTJ">INTJ (建築家)</option>
                      <option value="INTP">INTP (論理学者)</option>
                      <option value="ENTJ">ENTJ (指揮官)</option>
                      <option value="ENTP">ENTP (討論者)</option>
                    </optgroup>
                    <optgroup label="Diplomats (外交官)">
                      <option value="INFJ">INFJ (提唱者)</option>
                      <option value="INFP">INFP (仲介者)</option>
                      <option value="ENFJ">ENFJ (主人公)</option>
                      <option value="ENFP">ENFP (運動家)</option>
                    </optgroup>
                    <optgroup label="Sentinels (番人)">
                      <option value="ISTJ">ISTJ (管理者)</option>
                      <option value="ISFJ">ISFJ (擁護者)</option>
                      <option value="ESTJ">ESTJ (幹部)</option>
                      <option value="ESFJ">ESFJ (領事官)</option>
                    </optgroup>
                    <optgroup label="Explorers (探検家)">
                      <option value="ISTP">ISTP (巨匠)</option>
                      <option value="ISFP">ISFP (冒険家)</option>
                      <option value="ESTP">ESTP (起業家)</option>
                      <option value="ESFP">ESFP (エンターテイナー)</option>
                    </optgroup>
                  </select>
                </div>
                <div className="sm:flex-1">
                  <label className="block text-sm font-medium text-typecast-text mb-2">{t(lang, 'mood')}</label>
                  <textarea
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    placeholder="例: 仕事で理不尽なことがあってムシャクシャしてるから、とにかく派手にぶっ壊す映画が見たい。"
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
                  {(historyData[historyData.length - 1]?.score ?? 0) >= 3 ? '非常にポジティブ・高揚状態' :
                   (historyData[historyData.length - 1]?.score ?? 0) >= 1 ? 'ポジティブ・安定的' :
                   (historyData[historyData.length - 1]?.score ?? 0) === 0 ? 'ニュートラル・平常心' :
                   (historyData[historyData.length - 1]?.score ?? 0) >= -2 ? 'ネガティブ・疲労気味' :
                   '非常にネガティブ・要休息'}
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
                <div className="border-t border-typecast-border pt-3 flex justify-between items-center">
                  <span className="text-xs text-typecast-muted">{t(lang, 'feedback')}</span>
                  <div className="flex gap-1">
                    <button onClick={() => handleFeedback(movie.title, 'good')} className="p-2 rounded-lg hover:bg-typecast-bg text-typecast-muted hover:text-typecast-accent transition-colors" title={t(lang, 'like')}>
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleFeedback(movie.title, 'bad')} className="p-2 rounded-lg hover:bg-typecast-bg text-typecast-muted hover:text-red-500 transition-colors" title={t(lang, 'dislike')}>
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleFeedback(movie.title, 'watched')} className="p-2 rounded-lg hover:bg-typecast-bg text-typecast-muted hover:text-green-600 transition-colors" title={t(lang, 'watched')}>
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
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

      {/* アカウント削除モーダル */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              if (!deletingAccount) setShowDeleteAccountModal(false);
            }}
          />
          <div className="relative bg-typecast-surface rounded-2xl p-8 max-w-md w-full shadow-typecast-lg border border-typecast-border">
            <button
              onClick={() => setShowDeleteAccountModal(false)}
              className="absolute top-4 right-4 text-typecast-muted hover:text-typecast-text disabled:opacity-50"
              disabled={deletingAccount}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-typecast-text">{t(lang, 'accountDeleteTitle')}</h2>
                  <p className="mt-1 text-sm text-typecast-muted">{t(lang, 'accountDeleteBody')}</p>
                  {user?.email && (
                    <p className="mt-2 text-xs text-typecast-muted">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-typecast-bg rounded-lg p-4 border border-typecast-border space-y-3">
                <div>
                  <p className="text-xs font-semibold text-typecast-text">{t(lang, 'accountDeleteDeletedTitle')}</p>
                  <ul className="mt-2 text-sm text-typecast-secondary list-disc list-inside space-y-1">
                    <li>{t(lang, 'accountDeleteDeleted1')}</li>
                    <li>{t(lang, 'accountDeleteDeleted2')}</li>
                    <li>{t(lang, 'accountDeleteDeleted3')}</li>
                    <li>{t(lang, 'accountDeleteDeleted4')}</li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-typecast-border">
                  <p className="text-xs font-semibold text-typecast-text">{t(lang, 'accountDeleteNotDeletedTitle')}</p>
                  <ul className="mt-2 text-sm text-typecast-secondary list-disc list-inside space-y-1">
                    <li>{t(lang, 'accountDeleteNotDeleted1')}</li>
                    <li>{t(lang, 'accountDeleteNotDeleted2')}</li>
                  </ul>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-typecast-border"
                  checked={deleteAcknowledge}
                  onChange={(e) => setDeleteAcknowledge(e.target.checked)}
                  disabled={deletingAccount}
                />
                <span className="text-sm text-typecast-secondary">{t(lang, 'accountDeleteAcknowledge')}</span>
              </label>

              <div className="bg-typecast-surface rounded-lg p-4 border border-typecast-border">
                <p className="text-sm text-typecast-secondary">{t(lang, 'accountDeleteHint')}</p>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={t(lang, 'accountDeleteType')}
                  className="mt-3 w-full bg-typecast-bg border border-typecast-border rounded-lg px-3 py-2 text-sm text-typecast-text placeholder-typecast-muted focus:border-typecast-accent focus:ring-2 focus:ring-typecast-accent/20 outline-none"
                  disabled={deletingAccount}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteAccountModal(false);
                    setDeleteConfirmText('');
                    setDeleteAcknowledge(false);
                  }}
                  className="flex-1 border border-typecast-border rounded-lg py-3 text-sm font-medium text-typecast-muted hover:text-typecast-text hover:bg-typecast-bg transition-colors"
                  disabled={deletingAccount}
                >
                  {t(lang, 'accountDeleteCancel')}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-typecast-border disabled:text-typecast-muted text-white rounded-lg py-3 text-sm font-medium transition-colors"
                  disabled={deletingAccount || !deleteAcknowledge || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                >
                  {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t(lang, 'accountDeleteConfirm')}
                </button>
              </div>
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