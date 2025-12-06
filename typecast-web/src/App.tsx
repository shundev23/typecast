import { useState, useEffect } from 'react';
// アイコン
import { Sparkles, Loader2, Brain, Lightbulb, LogIn, LogOut, User as UserIcon, Share2 } from 'lucide-react';
// Firebase Auth (認証)
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
// Firestore (データベース)
import { doc, setDoc, serverTimestamp, getDocs, collection } from 'firebase/firestore'; 
// 設定ファイル
import { auth, googleProvider, db } from './firebase';
// チャートコンポーネント
import { MoodChart } from './components/MoodChart';

// --- 型定義 ---

type Provider = {
  name: string;
  logo: string;
  link: string;
}

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
  sentiment_score: number; // ★追加: 感情スコア
  movies: Movie[];
};

// ★追加: チャート表示用のデータ型
type HistoryItem = {
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
  
  // チャート用データ
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/recommend';

  // --- 1. ログイン状態の監視 ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. ログイン時に履歴データを取得 ---
  useEffect(() => {
    if (!user) {
      setHistoryData([]);
      return;
    }

    const fetchHistory = async () => {
      try {
        const historyRef = collection(db, 'users', user.uid, 'history');
        const snapshot = await getDocs(historyRef);
        const items: HistoryItem[] = [];
        
        snapshot.forEach(doc => {
          const data = doc.data();
          // scoreデータがある場合のみチャートに追加
          if (data.timestamp && typeof data.score === 'number') {
            items.push({
              timestamp: data.timestamp.toDate(),
              score: data.score,
              mood: data.mood || ''
            });
          }
        });
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

  const handleRecommend = async () => {
    if (!mood) return;
    setLoading(true);
    setMovies([]); // 前の結果をクリア

    console.log("--- Recommendation Started ---");

    // 除外リスト(被り防止)の作成
    let ignoreMovies: string[] = [];
    if (user) {
      try {
        const historyRef = collection(db, 'users', user.uid, 'history');
        const snapshot = await getDocs(historyRef);
        ignoreMovies = snapshot.docs.map(doc => doc.data().title);
      } catch (err) {
        console.error("Failed to fetch history for ignore list:", err);
      }
    }

    try {
      // APIリクエスト
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mbti, mood, ignore_movies: ignoreMovies }),
      });

      if (!res.ok) throw new Error('Network response was not ok');
      const data: RecommendResponse = await res.json();
      setMovies(data.movies);

      // Firestoreへの保存 & チャート更新
      if (user && data.movies.length > 0) {
        const savePromises = data.movies.map((movie) => {
          // タイトルの「/」を「：」に置換してエラーを防ぐ
          const safeTitle = movie.title.replace(/\//g, '：');
          const historyRef = doc(db, 'users', user.uid, 'history', safeTitle);
          
          return setDoc(historyRef, {
            title: movie.title,
            poster: movie.poster,
            timestamp: serverTimestamp(),
            // スコアと気分も保存
            score: data.sentiment_score,
            mood: mood
          });
        });
        
        await Promise.all(savePromises);
        
        // チャートを即時更新するためにstateにも追加
        setHistoryData(prev => [...prev, {
            timestamp: new Date(),
            score: data.sentiment_score,
            mood: mood
        }]);
      }

    } catch (error) {
      console.error("Error:", error);
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // シェア機能の実装
  const handleShare = () => {
    if (movies.length === 0) return;

    const latestScore = historyData[historyData.length - 1]?.score ?? 0;
    const scoreText = latestScore > 0 ? `+${latestScore}` : `${latestScore}`;
    
    // 映画タイトルをリスト化
    const movieList = movies.map(m => `・${m.title}`).join('\n');
    
    // 投稿テキストの作成
    const text = `🎬 TYPECAST Analysis Result\n\n👤 Type: ${mbti}\n🧠 Mood: "${mood}"\n📈 Sentiment: ${scoreText}\n\n🧪 Prescription:\n${movieList}\n\n#TYPECAST`;
    
    // URLエンコードしてTwitterの投稿画面を開く
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank');
  };

  // --- JSX (画面描画) ---

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
               <input 
                 type="text" 
                 value={mood} 
                 onChange={(e) => setMood(e.target.value)} 
                 placeholder="例: 知恵熱が出るような難解なやつ" 
                 className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:border-cyan-500 outline-none" 
                 onKeyDown={(e) => e.key === 'Enter' && handleRecommend()} 
               />
             </div>
          </div>
          <button onClick={handleRecommend} disabled={loading || !mood} className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all">
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
    </div>
  );
}

export default App;