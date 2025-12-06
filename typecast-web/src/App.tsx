import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Brain, Lightbulb, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDocs, collection } from 'firebase/firestore'; 
import { auth, googleProvider, db } from './firebase';

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

type Provider = {
  name: string;
  logo: string;
  link: string;
}

type RecommendResponse = {
  movies: Movie[];
};

function App() {
  const [mbti, setMbti] = useState('INTP');
  const [mood, setMood] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/recommend';

  // ログイン監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

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
    setMovies([]);

    console.log("--- Recommendation Started ---");
    console.log("Current User:", user);

    // 過去の履歴を取得して、除外リストを作成
    let ignoreMovies: string[] = [];
    if (user){
      try{
        const historyRef = collection(db, 'user', user.uid, 'history');
        const snapshot = await getDocs(historyRef);

        ignoreMovies = snapshot.docs.map(doc => doc.data().title);

        console.log("除外リスト(送信前):", ignoreMovies);
      }catch(err){
        console.error("Failed to fetch history:", err);
      }
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mbti, mood, ignore_movies: ignoreMovies }),
      });

      if (!res.ok) throw new Error('Network response was not ok');
      const data: RecommendResponse = await res.json();
      setMovies(data.movies);

      console.log("Movies fetched:", data.movies.length);

      // ★Firestoreへの保存処理
      if (user && data.movies.length > 0) {
        console.log("Saving to Firestore...", user.uid);
        
        const savePromises = data.movies.map((movie) => {
          
          const safeTitle = movie.title.replace(/\//g, '：');
          const historyRef = doc(db, 'users', user.uid, 'history', safeTitle);
          
          return setDoc(historyRef, {
            title: movie.title,
            poster: movie.poster,
            timestamp: serverTimestamp(),
          });
        });
        
        await Promise.all(savePromises);
        console.log("✅ History saved successfully!");
      }

    } catch (error) {
      console.error("Error:", error);
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans">
      <header className="max-w-6xl mx-auto mb-12 relative">
        {/* ログインエリア */}
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

        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/logo.png" alt="Typecast Logo" className="w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
            <h1 className="text-3xl font-bold tracking-wider">TYPECAST</h1>
          </div>
          <p className="text-gray-400">MBTI Logic-Based Cinema Recommender</p>
        </div>
      </header>

      {/* スマホ用ログイン */}
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

      {/* 入力フォーム */}
      <div className="max-w-2xl mx-auto bg-gray-900/80 p-6 rounded-2xl border border-gray-800 shadow-2xl mb-12 backdrop-blur-sm">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
             <div className="col-span-1">
               <label className="block text-xs font-bold text-gray-500 mb-1">TYPE</label>
               <select value={mbti} onChange={(e) => setMbti(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:border-cyan-500 outline-none">
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
               <input type="text" value={mood} onChange={(e) => setMood(e.target.value)} placeholder="例: 知恵熱が出るような難解なやつ" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:border-cyan-500 outline-none" onKeyDown={(e) => e.key === 'Enter' && handleRecommend()} />
             </div>
          </div>
          <button onClick={handleRecommend} disabled={loading || !mood} className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all">
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Analyze & Recommend</span>
          </button>
        </div>
      </div>

      {/* 結果表示 */}
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
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                  <Brain className="w-3 h-3" />
                  <span>{movie.label_main}</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{movie.reason_main}</p>
              </div>
              <div className="border-t border-gray-800 pt-3 space-y-1">
                <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
                  <Lightbulb className="w-3 h-3" />
                  <span>{movie.reason_sub}</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{movie.reason_sub}</p>
              </div>
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