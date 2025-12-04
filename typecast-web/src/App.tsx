import { useState } from 'react';
import { Film, Sparkles, Loader2, Brain, Lightbulb } from 'lucide-react';

// 新しいレスポンス型
type Movie = {
  title: string;
  year: string;
  reason_ti: string;
  reason_ne: string;
  poster: string;
};

type RecommendResponse = {
  movies: Movie[];
};

function App() {
  const [mbti, setMbti] = useState('INTP');
  const [mood, setMood] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  const API_URL = 'http://localhost:8080/api/recommend';

  const handleRecommend = async () => {
    if (!mood) return;
    setLoading(true);
    setMovies([]);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mbti, mood }),
      });

      if (!res.ok) throw new Error('Network response was not ok');
      const data: RecommendResponse = await res.json();
      setMovies(data.movies);
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans">
      <header className="max-w-6xl mx-auto mb-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Film className="w-8 h-8 text-cyan-400" />
          <h1 className="text-3xl font-bold tracking-wider">TYPECAST</h1>
        </div>
        <p className="text-gray-400">MBTI Logic-Based Cinema Recommender</p>
      </header>

      {/* 入力フォーム */}
      <div className="max-w-2xl mx-auto bg-gray-900/80 p-6 rounded-2xl border border-gray-800 shadow-2xl mb-12 backdrop-blur-sm">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
             <div className="col-span-1">
               <label className="block text-xs font-bold text-gray-500 mb-1">TYPE</label>
               <select 
                value={mbti} 
                onChange={(e) => setMbti(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:border-cyan-500 outline-none"
              >
                <option value="INTP">INTP</option>
                <option value="INTJ">INTJ</option>
                <option value="ENTP">ENTP</option>
                <option value="INFJ">INFJ</option>
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
          <button
            onClick={handleRecommend}
            disabled={loading || !mood}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Analyze & Recommend</span>
          </button>
        </div>
      </div>

      {/* 映画リスト表示エリア */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {movies.map((movie, idx) => (
          <div key={idx} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-cyan-500/50 transition-all group shadow-lg">
            {/* 画像エリア */}
            <div className="relative aspect-[2/3] overflow-hidden bg-gray-800">
              <img 
                src={movie.poster} 
                alt={movie.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent p-4 pt-20">
                <h3 className="text-xl font-bold text-white drop-shadow-md">{movie.title}</h3>
                <span className="text-sm text-cyan-400 font-mono">{movie.year}</span>
              </div>
            </div>
            
            {/* 解説エリア */}
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                  <Brain className="w-3 h-3" />
                  <span>Ti (Thinking)</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{movie.reason_ti}</p>
              </div>
              <div className="border-t border-gray-800 pt-3 space-y-1">
                <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
                  <Lightbulb className="w-3 h-3" />
                  <span>Ne (Intuition)</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{movie.reason_ne}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;