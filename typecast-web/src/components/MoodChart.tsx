import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';

type ChartData = {
  timestamp: Date;
  score: number;
  mood: string; // ツールチップで「どんな気分だったか」出す用
};

type Props = {
  data: ChartData[];
};

export const MoodChart = ({ data }: Props) => {
  if (data.length === 0) return null;

  // 日付順にソート
  const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return (
    <div className="w-full h-[300px] bg-gray-900/50 rounded-xl p-4 border border-gray-800 shadow-inner">
      <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center gap-2">
        <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
        Mental State Trajectory
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sortedData}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(date) => format(date, 'MM/dd')}
            stroke="#9ca3af"
            fontSize={12}
            tickMargin={10}
          />
          <YAxis 
            domain={[-5, 5]} 
            stroke="#9ca3af" 
            fontSize={12}
            tickCount={5}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#f3f4f6' }}
            itemStyle={{ color: '#22d3ee' }}
            labelFormatter={(label) => format(label, 'yyyy/MM/dd HH:mm')}
          />
          <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="3 3" />
          <Area 
            type="monotone" 
            dataKey="score" 
            stroke="#22d3ee" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorScore)" 
            name="Sentiment Score"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};