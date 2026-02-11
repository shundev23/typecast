import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../firebase';
import { 
  Film, 
  Settings, 
  Accessibility, 
  Ban, 
  LogOut, 
  Moon, 
  Sun, 
  Languages,
  Brain,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Eye,
  ArrowLeft
} from 'lucide-react';
import { t, type Lang } from '../i18n';
import { historyService } from '../services/history';
import { accountService } from '../services/account';
import { feedbackService } from '../services/feedback';
import type { HistoryItem, Feedback } from '../types';
import toast from 'react-hot-toast';

type MenuItem = 'history' | 'ratings' | 'accessibility' | 'account';

interface MyPageProps {
  user: User;
  lang: Lang;
  setLang: (lang: Lang) => void;
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
}

export function MyPage({ user, lang, setLang, darkMode, setDarkMode }: MyPageProps) {
  const navigate = useNavigate();
  const [selectedMenu, setSelectedMenu] = useState<MenuItem>('history');
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string>('');
  const [feedbackData, setFeedbackData] = useState<Feedback[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<string>('');
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAcknowledge, setDeleteAcknowledge] = useState(false);

  // 履歴データの取得
  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token) => {
      historyService.fetchAll(token)
        .then((data) => setHistoryData(data || []))
        .catch((error) => {
          console.error('Failed to fetch history:', error);
          setHistoryData([]);
        });
    }).catch(console.error);
  }, [user]);

  // 評価データの取得
  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token) => {
      feedbackService.getFeedbacks(token)
        .then((data) => setFeedbackData(data || []))
        .catch((error) => {
          console.error('Failed to fetch feedbacks:', error);
          setFeedbackData([]);
        });
    }).catch(console.error);
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error(t(lang, 'genericError'));
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE' || !deleteAcknowledge) return;
    setDeletingAccount(true);
    try {
      const token = await user.getIdToken();
      await accountService.deleteAccount(token, deleteConfirmText);
      toast.success(t(lang, 'accountDeleteSuccess'));
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error(t(lang, 'accountDeleteFailed'));
    } finally {
      setDeletingAccount(false);
      setShowDeleteAccountModal(false);
      setDeleteConfirmText('');
      setDeleteAcknowledge(false);
    }
  };

  const handleFeedback = async (movieTitle: string, type: 'good' | 'bad' | 'watched') => {
    try {
      const token = await user.getIdToken();
      await feedbackService.sendFeedback(movieTitle, type, token);
      const label = type === 'good' ? t(lang, 'like') : type === 'bad' ? t(lang, 'dislike') : t(lang, 'watched');
      toast.success(`${label}${t(lang, 'feedbackSaved')}`);
      
      // 評価データを再取得して即座に反映
      const updatedFeedbacks = await feedbackService.getFeedbacks(token);
      setFeedbackData(updatedFeedbacks || []);
    } catch (error) {
      console.error('Feedback error:', error);
      toast.error(t(lang, 'feedbackFailed'));
    }
  };

  const menuItems = [
    { id: 'history' as MenuItem, icon: Film, label: t(lang, 'myPageHistory') },
    { id: 'ratings' as MenuItem, icon: ThumbsUp, label: t(lang, 'myPageRatings') },
    { id: 'accessibility' as MenuItem, icon: Accessibility, label: t(lang, 'myPageAccessibility') },
    { id: 'account' as MenuItem, icon: Settings, label: t(lang, 'myPageAccount') },
  ];

  return (
    <div className="min-h-screen bg-typecast-bg">
      {/* ヘッダー */}
      <header className="border-b border-typecast-border bg-typecast-surface sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-typecast-text hover:text-typecast-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">{lang === 'ja' ? 'ホームに戻る' : 'Back to Home'}</span>
          </button>
          <h1 className="text-xl font-semibold text-typecast-text">{t(lang, 'myPageTitle')}</h1>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-6">
          {/* 左側メニュー */}
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-typecast-surface rounded-2xl border border-typecast-border p-2 sticky top-24">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedMenu(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    selectedMenu === item.id
                      ? 'bg-typecast-accent text-white'
                      : 'text-typecast-text hover:bg-typecast-bg'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* 右側コンテンツ */}
          <main className="flex-1">
            <div className="bg-typecast-surface rounded-2xl border border-typecast-border p-6">
              {/* 過去の映画一覧 */}
              {selectedMenu === 'history' && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <h2 className="text-lg font-semibold text-typecast-text">{t(lang, 'myPageHistory')}</h2>
                    {historyData.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-typecast-muted">{t(lang, 'filterByMood')}:</span>
                        <select
                          value={historyFilter}
                          onChange={(e) => setHistoryFilter(e.target.value)}
                          className="bg-typecast-bg border border-typecast-border rounded-lg px-3 py-1.5 text-sm text-typecast-text"
                        >
                          <option value="">{t(lang, 'filterAll')}</option>
                          {Array.from(new Set(historyData.map((h) => h.sentiment_label).filter(Boolean))).map((label) => (
                            <option key={label} value={label}>{label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                    {historyData.length === 0 ? (
                      <p className="text-typecast-muted text-center py-12">{t(lang, 'myPageEmpty')}</p>
                    ) : (
                      (() => {
                        const filteredData = historyData.filter((item) => !historyFilter || item.sentiment_label === historyFilter);
                        return filteredData.length === 0 ? (
                          <p className="text-typecast-muted text-center py-12">{t(lang, 'myPageEmpty')}</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredData.map((item, idx) => (
                            <div key={`${item.title}-${item.timestamp.getTime()}-${idx}`} className="bg-typecast-bg rounded-2xl overflow-hidden border border-typecast-border shadow-typecast group">
                              <div className="relative aspect-[2/3] overflow-hidden">
                                <img src={item.poster || '/logo.png'} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-16">
                                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                                  <span className="text-sm text-white/80">{item.year || ''}</span>
                                </div>
                              </div>
                              <div className="p-5 space-y-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-typecast-accent text-xs font-medium">
                                    <Brain className="w-3.5 h-3.5" />
                                    <span>{item.label_main || ''}</span>
                                  </div>
                                  <p className="text-sm text-typecast-secondary leading-relaxed line-clamp-2">{item.reason_main || ''}</p>
                                </div>
                                <div className="border-t border-typecast-border pt-3 space-y-2">
                                  <div className="flex items-center gap-2 text-typecast-muted text-xs font-medium">
                                    <Lightbulb className="w-3.5 h-3.5" />
                                    <span>{item.label_sub || ''}</span>
                                  </div>
                                  <p className="text-sm text-typecast-secondary leading-relaxed line-clamp-2">{item.reason_sub || ''}</p>
                                </div>
                                {item.providers && item.providers.length > 0 && (
                                  <div className="border-t border-typecast-border pt-3">
                                    <p className="text-xs text-typecast-muted font-medium mb-2">{t(lang, 'availableInJP')}</p>
                                    <div className="flex flex-wrap gap-2">
                                      {item.providers.map((provider, pIdx) => (
                                        <a key={pIdx} href={provider.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                                          <img src={provider.logo} alt={provider.name} title={provider.name} className="w-8 h-8 rounded-lg object-contain border border-typecast-border" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="border-t border-typecast-border pt-3 flex justify-between items-center">
                                  <span className="text-xs text-typecast-muted">
                                    {item.timestamp.toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {item.sentiment_label || ''}
                                  </span>
                                  <div className="flex gap-1">
                                    <button onClick={() => handleFeedback(item.title, 'good')} className="p-2 rounded-lg hover:bg-typecast-surface text-typecast-muted hover:text-typecast-accent transition-colors" title={t(lang, 'like')}>
                                      <ThumbsUp className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleFeedback(item.title, 'bad')} className="p-2 rounded-lg hover:bg-typecast-surface text-typecast-muted hover:text-red-500 transition-colors" title={t(lang, 'dislike')}>
                                      <ThumbsDown className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleFeedback(item.title, 'watched')} className="p-2 rounded-lg hover:bg-typecast-surface text-typecast-muted hover:text-green-600 transition-colors" title={t(lang, 'watched')}>
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            ))}
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              )}

              {/* 評価履歴 */}
              {selectedMenu === 'ratings' && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <h2 className="text-lg font-semibold text-typecast-text">{t(lang, 'myPageRatings')}</h2>
                    {feedbackData.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-typecast-muted">{t(lang, 'filterByRating')}:</span>
                        <select
                          value={feedbackFilter}
                          onChange={(e) => setFeedbackFilter(e.target.value)}
                          className="bg-typecast-bg border border-typecast-border rounded-lg px-3 py-1.5 text-sm text-typecast-text"
                        >
                          <option value="">{t(lang, 'filterAll')}</option>
                          <option value="good">{t(lang, 'like')}</option>
                          <option value="bad">{t(lang, 'dislike')}</option>
                          <option value="watched">{t(lang, 'watched')}</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                    {feedbackData.length === 0 ? (
                      <p className="text-typecast-muted text-center py-12">{t(lang, 'myPageRatingsEmpty')}</p>
                    ) : (
                      (() => {
                        const filteredFeedback = feedbackData.filter((item) => !feedbackFilter || item.type === feedbackFilter);
                        return filteredFeedback.length === 0 ? (
                          <p className="text-typecast-muted text-center py-12">{t(lang, 'myPageRatingsEmpty')}</p>
                        ) : (
                          <div className="space-y-3">
                            {filteredFeedback.map((item, idx) => {
                            const typeLabel = item.type === 'good' ? t(lang, 'like') : item.type === 'bad' ? t(lang, 'dislike') : t(lang, 'watched');
                            const typeColor = item.type === 'good' ? 'text-typecast-accent' : item.type === 'bad' ? 'text-red-500' : 'text-green-600';
                            const typeIcon = item.type === 'good' ? ThumbsUp : item.type === 'bad' ? ThumbsDown : Eye;
                            const TypeIcon = typeIcon;
                            
                            return (
                              <div key={`${item.title}-${item.created_at}-${idx}`} className="bg-typecast-bg rounded-xl border border-typecast-border p-4 hover:border-typecast-accent transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <h3 className="text-base font-semibold text-typecast-text mb-1">{item.title}</h3>
                                    <div className="flex items-center gap-2 text-xs text-typecast-muted">
                                      <span>{new Date(item.created_at).toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                  </div>
                                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-typecast-surface border border-typecast-border ${typeColor}`}>
                                    <TypeIcon className="w-4 h-4" />
                                    <span className="text-sm font-medium">{typeLabel}</span>
                                  </div>
                                </div>
                              </div>
                            );
                            })}
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              )}

              {/* アクセシビリティ */}
              {selectedMenu === 'accessibility' && (
                <div>
                  <h2 className="text-lg font-semibold text-typecast-text mb-6">{t(lang, 'myPageAccessibility')}</h2>
                  <div className="space-y-3">
                    <button
                      onClick={() => setDarkMode(!darkMode)}
                      className="w-full flex items-center justify-between px-4 py-3 text-typecast-text hover:bg-typecast-bg rounded-lg transition-colors border border-typecast-border"
                    >
                      <div className="flex items-center gap-3">
                        {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        <span className="font-medium">{t(lang, 'darkModeToggle')}</span>
                      </div>
                      <span className="text-sm text-typecast-muted">{darkMode ? 'Dark' : 'Light'}</span>
                    </button>
                    <button
                      onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}
                      className="w-full flex items-center justify-between px-4 py-3 text-typecast-text hover:bg-typecast-bg rounded-lg transition-colors border border-typecast-border"
                    >
                      <div className="flex items-center gap-3">
                        <Languages className="w-5 h-5" />
                        <span className="font-medium">{t(lang, 'languageToggle')}</span>
                      </div>
                      <span className="text-sm text-typecast-muted">{lang === 'ja' ? '日本語' : 'English'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* アカウント設定 */}
              {selectedMenu === 'account' && (
                <div>
                  <h2 className="text-lg font-semibold text-typecast-text mb-6">{t(lang, 'myPageAccount')}</h2>
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowDeleteAccountModal(true)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors border border-red-200 dark:border-red-900"
                    >
                      <Ban className="w-5 h-5" />
                      <span className="font-medium">{t(lang, 'accountDelete')}</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-typecast-text hover:bg-typecast-bg rounded-lg transition-colors border border-typecast-border"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">{t(lang, 'logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* アカウント削除モーダル */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteAccountModal(false)} />
          <div className="relative bg-typecast-surface rounded-2xl p-6 max-w-md w-full border border-typecast-border shadow-typecast-lg">
            <h2 className="text-xl font-semibold text-typecast-text mb-4">{t(lang, 'accountDeleteTitle')}</h2>
            <p className="text-typecast-secondary mb-4">{t(lang, 'accountDeleteBody')}</p>
            
            <div className="mb-4 space-y-2">
              <p className="text-sm font-semibold text-typecast-text">{t(lang, 'accountDeleteDeletedTitle')}</p>
              <ul className="text-xs text-typecast-secondary space-y-1 list-disc list-inside">
                <li>{t(lang, 'accountDeleteDeleted1')}</li>
                <li>{t(lang, 'accountDeleteDeleted2')}</li>
                <li>{t(lang, 'accountDeleteDeleted3')}</li>
                <li>{t(lang, 'accountDeleteDeleted4')}</li>
              </ul>
            </div>

            <div className="mb-4 space-y-2">
              <p className="text-sm font-semibold text-typecast-text">{t(lang, 'accountDeleteNotDeletedTitle')}</p>
              <ul className="text-xs text-typecast-secondary space-y-1 list-disc list-inside">
                <li>{t(lang, 'accountDeleteNotDeleted1')}</li>
                <li>{t(lang, 'accountDeleteNotDeleted2')}</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="flex items-start gap-2 text-sm text-typecast-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteAcknowledge}
                  onChange={(e) => setDeleteAcknowledge(e.target.checked)}
                  className="mt-1"
                />
                <span>{t(lang, 'accountDeleteAcknowledge')}</span>
              </label>
            </div>

            <div className="mb-4">
              <p className="text-sm text-typecast-secondary mb-2">{t(lang, 'accountDeleteHint')}</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={t(lang, 'accountDeleteType')}
                className="w-full px-4 py-2 bg-typecast-bg border border-typecast-border rounded-lg text-typecast-text"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteAccountModal(false);
                  setDeleteConfirmText('');
                  setDeleteAcknowledge(false);
                }}
                className="flex-1 px-4 py-2 bg-typecast-bg text-typecast-text rounded-lg hover:bg-typecast-border transition-colors"
              >
                {t(lang, 'accountDeleteCancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || !deleteAcknowledge || deletingAccount}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingAccount ? (lang === 'ja' ? '削除中...' : 'Deleting...') : t(lang, 'accountDeleteConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
