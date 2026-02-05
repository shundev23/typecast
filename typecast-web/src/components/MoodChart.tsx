import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { Lock, Activity } from 'lucide-react';
import type { Lang } from '../i18n';

type ChartData = {
  timestamp: Date;
  score: number;
  mood: string;
};

type Props = {
  data: ChartData[];
  lang: Lang;
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

const CustomTooltip = ({ active, payload, label, lang }: CustomTooltipProps & { lang: Lang }) => {
  if (active && payload && payload.length > 0) {
    const score = payload[0].value;
    const moodText = payload[0].payload.mood;

    let status = lang === 'ja' ? 'ニュートラル' : 'Neutral';
    if (score >= 3) status = lang === 'ja' ? '非常にポジティブ' : 'Very Positive';
    else if (score >= 1) status = lang === 'ja' ? 'ポジティブ' : 'Positive';
    else if (score <= -3) status = lang === 'ja' ? '非常にネガティブ' : 'Very Negative';
    else if (score <= -1) status = lang === 'ja' ? 'ネガティブ' : 'Negative';

    return (
      <div className="bg-white border border-[#ebebeb] p-3 rounded-lg shadow-lg max-w-xs">
        <p className="text-[#717171] text-xs mb-1">
          {label ? format(label, 'MM/dd') : ''} ({lang === 'ja' ? '日平均' : 'Daily Avg'})
        </p>
        <p className="text-[#e31c5f] font-semibold text-sm">
          Score: {score} <span className="text-[#717171] text-xs ml-1 font-normal">({status})</span>
        </p>
        <p className="text-[#484848] text-xs mt-2 italic border-t border-[#ebebeb] pt-1">
          "{moodText}"
        </p>
      </div>
    );
  }
  return null;
};

export const MoodChart = ({ data, lang }: Props) => {
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
      <div className="w-full bg-white rounded-2xl p-6 border border-[#ebebeb] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)] text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#ebebeb]">
          <div className="h-full bg-[#e31c5f] transition-all duration-1000" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="p-4 bg-[#f7f7f5] rounded-full text-[#717171]">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#222222]">{lang === 'ja' ? '週間リズム分析' : 'Weekly Rhythm Analysis'}</h3>
            <p className="text-sm text-[#717171] mt-2 max-w-md mx-auto">
              {lang === 'ja' ? (
                <>
                  あと <span className="text-[#e31c5f] font-semibold">{REQUIRED_DAYS - uniqueDays}日分</span> のデータで表示できます
                </>
              ) : (
                <>
                  Add <span className="text-[#e31c5f] font-semibold">{REQUIRED_DAYS - uniqueDays}</span> more day(s) to unlock
                </>
              )}
            </p>
          </div>
          <div className="text-xs text-[#717171]">
            {uniqueDays} / {REQUIRED_DAYS} {lang === 'ja' ? '日' : 'days'}
          </div>
        </div>
      </div>
    );
  }

  // --- UI: チャート表示 (ロック解除後) ---
  return (
    <div className="w-full h-[350px] bg-white rounded-2xl p-6 border border-[#ebebeb] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h3 className="text-sm font-medium text-[#222222] flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#e31c5f]" />
          {lang === 'ja' ? '週間メンタル推移' : 'Weekly Mental Trajectory'}
        </h3>
        <div className="flex gap-4 text-xs text-[#717171]">
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#e31c5f]/30 rounded-full"></div> {lang === 'ja' ? 'ポジティブ' : 'Positive'}</span>
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500/30 rounded-full"></div> {lang === 'ja' ? 'ネガティブ' : 'Negative'}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e31c5f" stopOpacity={0.3}/>
              <stop offset="50%" stopColor="#e31c5f" stopOpacity={0.08}/>
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ebebeb" vertical={false} />
          <XAxis dataKey="timestamp" tickFormatter={(date) => format(date, 'MM/dd')} stroke="#717171" fontSize={11} tickMargin={10} />
          <YAxis domain={[-5, 5]} stroke="#717171" fontSize={11} tickCount={5} ticks={[-5, 0, 5]} />
          <Tooltip content={<CustomTooltip lang={lang} />} />
          <ReferenceLine y={0} stroke="#717171" strokeDasharray="3 3" />
          <Area type="monotone" dataKey="score" stroke="#e31c5f" strokeWidth={2} fill="url(#colorScore)" animationDuration={1500} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};