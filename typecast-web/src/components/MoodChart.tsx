import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { Lock, Activity } from 'lucide-react';

type ChartData = {
  timestamp: Date;
  score: number;
  mood: string;
};

type Props = {
  data: ChartData[];
};

// ツールチップの定義
type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: ChartData;
  }>;
  label?: Date;
};

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length > 0) {
    const score = payload[0].value;
    const moodText = payload[0].payload.mood;

    let status = "Neutral";
    if (score >= 3) status = "Very Positive";
    else if (score >= 1) status = "Positive";
    else if (score <= -3) status = "Very Negative";
    else if (score <= -1) status = "Negative";

    return (
      <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-xl max-w-xs">
        <p className="text-gray-400 text-xs mb-1">
          {label ? format(label, 'MM/dd') : ''} (Daily Avg)
        </p>
        <p className="text-cyan-400 font-bold text-sm">
          Score: {score} <span className="text-gray-500 text-xs ml-1">({status})</span>
        </p>
        <p className="text-gray-300 text-xs mt-2 italic border-t border-gray-800 pt-1">
          "{moodText}"
        </p>
      </div>
    );
  }
  return null;
};

export const MoodChart = ({ data }: Props) => {
  // 1. ロック判定: ユニークな日付の数をカウント
  const uniqueDays = new Set(
    data.map(item => format(item.timestamp, 'yyyy-MM-dd'))
  ).size;

  const REQUIRED_DAYS = 7;
  const progress = Math.min((uniqueDays / REQUIRED_DAYS) * 100, 100);
  const isLocked = uniqueDays < REQUIRED_DAYS;

  // 2. データ集計ロジック (日別平均化)
  // A. 直近1週間分のデータに絞る
  const oneWeekAgo = startOfDay(subDays(new Date(), 7));
  const rawRecentData = data.filter(item => item.timestamp >= oneWeekAgo);

  // B. 日付ごとにグループ化して平均を算出
  const dailyMap = new Map<string, { total: number; count: number; moods: string[] }>();

  rawRecentData.forEach(item => {
    const dateKey = format(item.timestamp, 'yyyy-MM-dd');
    const current = dailyMap.get(dateKey) || { total: 0, count: 0, moods: [] };
    
    dailyMap.set(dateKey, {
      total: current.total + item.score,
      count: current.count + 1,
      moods: [...current.moods, item.mood] // その日の気分メモを配列で保持
    });
  });

  // C. チャート用データ形式に変換
  const chartData = Array.from(dailyMap.entries()).map(([dateKey, val]) => {
    // 平均スコア算出 (小数点第1位まで)
    const avgScore = Math.round((val.total / val.count) * 10) / 10;
    
    // 気分テキストを結合 (最大3つまで表示して、それ以上は "..." にする)
    const uniqueMoods = Array.from(new Set(val.moods)); // 重複する気分名は排除
    const moodDisplay = uniqueMoods.slice(0, 3).join(" / ") + (uniqueMoods.length > 3 ? "..." : "");

    return {
      timestamp: new Date(dateKey),
      score: avgScore,
      mood: moodDisplay
    };
  }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());


  // --- UI: データ不足時のロック画面 ---
  if (isLocked) {
    return (
      <div className="w-full bg-gray-900/50 rounded-xl p-6 border border-gray-800 shadow-inner text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gray-800">
          <div className="h-full bg-cyan-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="p-4 bg-gray-800 rounded-full text-gray-500 animate-pulse">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-200">Weekly Rhythm Analysis</h3>
            <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
              正確なバイオリズムを算出するために、あと <span className="text-cyan-400 font-bold">{REQUIRED_DAYS - uniqueDays}日分</span> のデータが必要です。
            </p>
          </div>
          <div className="text-xs font-mono text-gray-500">
            Progress: {uniqueDays} / {REQUIRED_DAYS} Days
          </div>
        </div>
      </div>
    );
  }

  // --- UI: チャート表示 (ロック解除後) ---
  return (
    <div className="w-full h-[350px] bg-gray-900/50 rounded-xl p-6 border border-gray-800 shadow-inner">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-500" />
          Weekly Mental Trajectory
        </h3>
        <div className="flex gap-4 text-[10px] font-mono text-gray-500">
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-cyan-500/20 border border-cyan-500 rounded-full"></div> Positive Zone</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500/20 border border-red-500 rounded-full"></div> Negative Zone</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4}/>
              <stop offset="50%" stopColor="#22d3ee" stopOpacity={0.1}/>
              <stop offset="100%" stopColor="#f87171" stopOpacity={0.4}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(date) => format(date, 'MM/dd')}
            stroke="#6b7280"
            fontSize={10}
            tickMargin={10}
          />
          
          <YAxis 
            domain={[-5, 5]} 
            stroke="#6b7280" 
            fontSize={10}
            tickCount={5}
            ticks={[-5, 0, 5]} 
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="3 3" />
          
          <Area 
            type="monotone" 
            dataKey="score" 
            stroke="#22d3ee" 
            strokeWidth={2}
            fill="url(#colorScore)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};