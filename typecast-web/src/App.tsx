import { useState, useEffect } from 'react';
// アイコン
import { Sparkles, Loader2, Brain, Lightbulb, LogIn, LogOut, User as UserIcon, Share2, Ban, X } from 'lucide-react';
// Firebase Auth (認証)
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
// Firestoreのimportを削除し、authのみ残す
import { auth, googleProvider } from './firebase';
// チャートコンポーネント
import { MoodChart } from './components/MoodChart';

// --- 型定義 ---

type Provider = {
  name: string;
  logo: string;
  link: string;
};

type Movie = {
  title: string;
  year: string;
  reason_main: string;
  reason_sub: string;
  label_main: string;
  label_sub: string;
  poster: string;
  providers?: Provider[];
};

type RecommendResponse = {
  sentiment_score: number;
  movies: Movie[];
};

// Backendのモデルに合わせて更新 (titleを追加)
type HistoryItem = {
  title: string; // 除外リスト生成に使用
  timestamp: Date;
  score: number;
  mood: string;
};

function App() {
  // --- State管理 ---
  const [mbti, setMbti] = useState('INTP');
  const [mood, setMood] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  
  // チャート用データ
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
        const res = await fetch(`${API_URL}/api/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          // APIのレスポンスデータの型に合わせる
          type ApiHistoryItem = {
            title: string;
            score: number;
            mood: string;
            timestamp: string; // JSONなので日付は文字列
          };

          // 返ってきたJSONをApiHistoryItemの配列とみなして受け取る
          const data = await res.json() as ApiHistoryItem[];
          
          const items = data.map((item) => ({
            title: item.title,
            score: item.score,
            mood: item.mood,
            timestamp: new Date(item.timestamp) // 文字列をDate型に変換
          }));
          
          setHistoryData(items);
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      }
    };

    fetchHistory();
  }, [user, API_URL]);

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

  const handleRecommend = async () => {
    if (!mood) return;

    if (!user) {
        alert("ログインしてください");
        return;
    }

    setLoading(true);
    setMovies([]);

    setShowLimitModal(false);

    console.log("--- Recommendation Started ---");

    try {
      const token = await user.getIdToken();

      // 除外リストはステート(historyData)から作成 (APIを叩く必要なし)
      // これにより、Firestore読み取り回数を節約＆高速化
      const ignoreMovies = historyData.map(item => item.title);

      // レコメンドAPI実行
      const res = await fetch(`${API_URL}/api/recommend`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ mbti, mood, ignore_movies: ignoreMovies }),
      });

      if (res.status === 429) {
        setShowLimitModal(true); // モーダルを開く
        setLoading(false);
        return; 
      }

      if (!res.ok) throw new Error('Network response was not ok');
      const data: RecommendResponse = await res.json();
      setMovies(data.movies);

      // API経由で履歴を保存
      if (data.movies.length > 0) {
        // Backendの SaveHistoryRequest に合わせたデータ構造
        const historyPayload = {
          movies: data.movies.map(m => ({
             title: m.title,
             poster: m.poster,
             // timestampはBackend側で付けるので不要
          })),
          mood: mood,
          score: data.sentiment_score
        };

        await fetch(`${API_URL}/api/history`, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${token}`
           },
           body: JSON.stringify(historyPayload)
        });

        // チャート即時更新用（再フェッチせずにstateに追加）
        setHistoryData(prev => [
            // 新しい順に表示するなら先頭に追加するが、チャート用なら末尾に追加
            ...prev, 
            {
                title: data.movies[0].title, // 代表で1つ、または本来は複数追加すべきだがチャート用ならscore重視でOK
                timestamp: new Date(),
                score: data.sentiment_score,
                mood: mood
            }
        ]);
      }

    } catch (error) {
      console.error("Error:", error);
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // シェア機能の実装
  const handleShare = async () => {
    if (movies.length === 0) return;
    
    // 直近の結果を取得
    const movie = movies[0]; // 先頭の映画をタイトルにする
    const latestScore = historyData[historyData.length - 1]?.score ?? 0;
    
    try {      
      const res = await fetch(`${API_URL}/api/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: movie.title,
          mood: mood,
          score: latestScore
        }),
      });

      if (!res.ok) throw new Error("Share failed");

      const data = await res.json();
      const shareUrl = data.share_url; // http://localhost:8080/s/xxxx

      // 2. Xの投稿画面を開く
      // ユーザーに見せるURLは、今作った短縮URL (shareUrl) にする
      const text = `🎬 TYPECAST Analysis Result\n\n👤 Type: ${mbti}\n🧠 Mood: "${mood}"\n\n#TYPECAST`;
      const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
      console.log("Opening X share URL:", xUrl);
      
      window.open(xUrl, '_blank');

    } catch (error) {
      console.error("Share Error:", error);
      alert("シェアリンクの作成に失敗しました。");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans">
      <header className="max-w-6xl mx-auto mb-12 relative">
        {/* PC用ログインエリア */}
        <div className="absolute right-0 top-0 hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3 bg-gray-900 px-4 py-2 rounded-full border border-gray-800">
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-gray-600" />
              ) : (
                <UserIcon className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-sm text-gray-300 font-medium hidden lg:block">{user.displayName}</span>
              <button onClick={handleLogout} className="ml-2 p-1 hover:bg-gray-800 rounded-full text-gray-500 hover:text-red-400 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={handleLogin} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-cyan-400 px-4 py-2 rounded-full border border-gray-700 transition-all text-sm font-bold">
              <LogIn className="w-4 h-4" />
              <span>Login / Sign up</span>
            </button>
          )}
        </div>

        {/* ロゴエリア */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/logo.png" alt="Typecast Logo" className="w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
            <h1 className="text-3xl font-bold tracking-wider">TYPECAST</h1>
          </div>
          <p className="text-gray-400">MBTI Logic-Based Cinema Recommender</p>
        </div>
      </header>

      {/* スマホ用ログインボタン */}
      <div className="md:hidden flex justify-center mb-8">
          {!user && (
            <button onClick={handleLogin} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-cyan-400 px-6 py-2 rounded-full border border-gray-700 transition-all text-sm font-bold">
              <LogIn className="w-4 h-4" />
              <span>Login with Google</span>
            </button>
          )}
          {user && (
             <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Logged in as {user.displayName}</span>
                <button onClick={handleLogout} className="text-xs text-red-400 underline">Logout</button>
             </div>
          )}
      </div>

      {/* 感情分析チャート (データがあるときだけ表示) */}
      {user && historyData.length > 0 && (
        <div className="max-w-4xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
           <MoodChart data={historyData} />
        </div>
      )}

      {/* 入力フォーム */}
      <div className="max-w-2xl mx-auto bg-gray-900/80 p-6 rounded-2xl border border-gray-800 shadow-2xl mb-12 backdrop-blur-sm">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
             <div className="col-span-1">
               <label className="block text-xs font-bold text-gray-500 mb-1">TYPE</label>
               {/* 16タイプ対応のセレクトボックス */}
               <select 
                  value={mbti} 
                  onChange={(e) => setMbti(e.target.value)} 
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:border-cyan-500 outline-none appearance-none"
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
             <div className="col-span-2">
               <label className="block text-xs font-bold text-gray-500 mb-1">MOOD</label>
               <textarea
                 value={mood} 
                 onChange={(e) => setMood(e.target.value)} 
                 placeholder="例: 仕事で理不尽なことがあってムシャクシャしてるから、とにかく派手にぶっ壊す映画が見たい。" 
                 rows={3} // 3行分の高さを確保
                 className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder-gray-600 resize-none leading-relaxed"
                 onKeyDown={(e) => {
                    // Enterキーで送信 (Shift+Enterなら改行)
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
            className="w-full mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-cyan-900/20"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Analyze & Recommend</span>
          </button>
        </div>
      </div>

      {movies.length > 0 && (
        <div className="max-w-6xl mx-auto mb-8 flex justify-center">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 px-8 flex items-center gap-6 shadow-lg animate-in fade-in slide-in-from-bottom-2">
                <div className="text-center border-r border-gray-700 pr-6">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Sentiment Score</p>
                    <p className={`text-3xl font-bold ${
                        // スコアによって色を変える
                        (historyData[historyData.length - 1]?.score ?? 0) > 0 ? 'text-cyan-400' : 
                        (historyData[historyData.length - 1]?.score ?? 0) < 0 ? 'text-red-400' : 'text-gray-200'
                    }`}>
                        {historyData[historyData.length - 1]?.score > 0 ? '+' : ''}
                        {historyData[historyData.length - 1]?.score}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Analysis</p>
                    <p className="text-gray-300 text-sm font-medium">
                        {/* スコアに応じたテキスト判定 */}
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
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium border border-gray-700 hover:border-gray-500 rounded-full px-4 py-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Result on X</span>
            </button>
        </div>
      )}

      {/* 結果表示エリア */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {movies.map((movie, idx) => (
          <div key={idx} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-cyan-500/50 transition-all group shadow-lg">
            <div className="relative aspect-[2/3] overflow-hidden bg-gray-800">
              <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent p-4 pt-20">
                <h3 className="text-xl font-bold text-white drop-shadow-md">{movie.title}</h3>
                <span className="text-sm text-cyan-400 font-mono">{movie.year}</span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* 主機能 (label_main を使用) */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                  <Brain className="w-3 h-3" />
                  <span>{movie.label_main}</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{movie.reason_main}</p>
              </div>
              {/* 補助機能 (label_sub を使用) */}
              <div className="border-t border-gray-800 pt-3 space-y-1">
                <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
                  <Lightbulb className="w-3 h-3" />
                  <span>{movie.label_sub}</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{movie.reason_sub}</p>
              </div>
              
              {/* 配信サイト情報 */}
              {movie.providers && movie.providers.length > 0 && (
                <div className="border-t border-gray-800 pt-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Available on (JP)</p>
                  <div className="flex flex-wrap gap-2">
                    {movie.providers.map((provider, pIdx) => (
                      <a key={pIdx} href={provider.link} target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-110">
                        <img src={provider.logo} alt={provider.name} title={`Watch on ${provider.name}`} className="w-8 h-8 rounded-md border border-gray-700 shadow-sm cursor-pointer" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* 背景のぼかしフィルター */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setShowLimitModal(false)}
          />
          
          {/* モーダル本体 */}
          <div className="relative bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-in zoom-in-95 duration-300">
            {/* 閉じるボタン */}
            <button 
              onClick={() => setShowLimitModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4">
              {/* アイコン */}
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 mb-2">
                <Ban className="w-8 h-8 text-red-500" />
              </div>

              {/* タイトル */}
              <div>
                <h2 className="text-2xl font-bold text-white tracking-wider mb-1">SYSTEM COOLDOWN</h2>
                <p className="text-red-400 text-xs font-mono uppercase tracking-widest">Daily Limit Reached (3/3)</p>
              </div>

              {/* メッセージ本文 */}
              <div className="bg-gray-950/50 rounded-lg p-4 border border-gray-800 text-left w-full">
                <p className="text-gray-300 text-sm leading-relaxed">
                  本日の分析リソース上限に達しました。
                  <br />
                  過度な情報の摂取は、決定麻痺（Analysis Paralysis）を引き起こす可能性があります。
                </p>
                <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500 font-mono">
                  &gt; Next session available: <span className="text-cyan-400">Tomorrow 00:00 JST</span>
                </div>
              </div>

              {/* アクションボタン */}
              <button
                onClick={() => setShowLimitModal(false)}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl border border-gray-700 transition-all mt-2"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;