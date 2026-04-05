import { useMemo } from 'react';
import { TrendingUp, Package, Zap, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ScanRecord } from '../types';
import { isToday, getHours } from 'date-fns';

interface DashboardViewProps {
  history: ScanRecord[];
  onBack: () => void;
}

export default function DashboardView({ history, onBack }: DashboardViewProps) {
  const stats = useMemo(() => {
    const todayRecords = history.filter(record => isToday(record.finishTime));
    const totalToday = todayRecords.length;
    let totalSeconds = 0;
    const hourCounts: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourCounts[i] = 0;

    todayRecords.forEach(record => {
      totalSeconds += (record.finishTime - record.scanTime) / 1000;
      const hour = getHours(record.finishTime);
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const avgSpeed = totalToday > 0 ? Math.round(totalSeconds / totalToday) : 0;
    let bestHour = 0, maxOrders = 0;
    Object.entries(hourCounts).forEach(([h, c]) => { if (c > maxOrders) { maxOrders = c; bestHour = parseInt(h); } });

    const chartData = Object.entries(hourCounts)
      .filter(([h]) => parseInt(h) >= 6 && parseInt(h) <= 22)
      .map(([h, count]) => ({ hour: `${h}h`, count, isBest: parseInt(h) === bestHour && count > 0 }));

    return { totalToday, avgSpeed, bestHour: maxOrders > 0 ? `${bestHour}:00 - ${bestHour + 1}:00` : 'Chưa có', chartData };
  }, [history]);

  const formatSpeed = (s: number) => {
    if (s === 0) return '--';
    const m = Math.floor(s / 60), r = s % 60;
    return m > 0 ? `${m}p ${r}s` : `${r}s`;
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-y-auto pb-24 flex flex-col">
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl flex items-center gap-4 px-6 h-16 shrink-0 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-700">
        <h1 className="font-bold text-xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <BarChart2 className="text-blue-600" />
          Thống Kê Hôm Nay
        </h1>
      </header>

      <div className="p-6 flex-1 flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100/50 dark:border-slate-700 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 flex items-center justify-center mb-3 shadow-inner">
                <Package size={20} />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Đã Đóng Gói</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.totalToday}</span>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">đơn</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100/50 dark:border-slate-700 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-50 dark:bg-amber-900/30 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 flex items-center justify-center mb-3 shadow-inner">
                <Zap size={20} />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tốc Độ TB</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{formatSpeed(stats.avgSpeed)}</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">/đơn</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl p-6 shadow-lg shadow-blue-500/20 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
              <TrendingUp size={24} className="text-white" />
            </div>
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Khung giờ năng suất nhất</p>
              <p className="text-2xl font-bold tracking-tight">{stats.bestHour}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100/50 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 dark:text-white tracking-tight">Biểu đồ theo giờ</h3>
            <div className="bg-slate-50 dark:bg-slate-700 px-3 py-1 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-600">
              Hôm nay
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: 'rgba(241,245,249,0.3)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isBest ? '#3b82f6' : '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
