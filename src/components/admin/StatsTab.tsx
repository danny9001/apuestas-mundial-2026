'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw, TrendingUp, Users, Trophy, Activity, BarChart3, Target, Clock, Mail, CheckCheck } from 'lucide-react';

// Recharts must be loaded client-side only
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });

const CATEGORY_COLORS: Record<string, string> = {
  ACCESO: '#eab308',
  PRONOSTICO: '#22c55e',
  USUARIO: '#3b82f6',
  MENSAJE: '#a855f7',
  REGISTRO: '#f97316',
  PARTIDO: '#ef4444',
  PERFIL: '#06b6d4',
  NOTIFICACION: '#ec4899',
};

const CATEGORY_LABELS: Record<string, string> = {
  ACCESO: 'Ingresos',
  PRONOSTICO: 'Pronósticos',
  USUARIO: 'Usuarios',
  MENSAJE: 'Mensajes',
  REGISTRO: 'Registros',
  PARTIDO: 'Partidos',
  PERFIL: 'Perfiles',
  NOTIFICACION: 'Notif. Leídas',
};

const DAY_OPTIONS = [
  { label: '7 días', value: 7 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
];

const CHART_STYLE = {
  backgroundColor: 'transparent',
  borderRadius: 8,
};

const tooltipStyle = {
  backgroundColor: '#0a0a0a',
  border: '1px solid #262626',
  borderRadius: 8,
  color: '#e5e5e5',
  fontSize: 11,
};

interface StatsTabProps {
  user: any;
}

export default function StatsTab({ user }: StatsTabProps) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSeries, setActiveSeries] = useState<Record<string, boolean>>({
    acceso: true,
    pronostico: true,
    usuario: false,
    mensaje: false,
    registro: false,
  });

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?days=${days}&t=${Date.now()}`);
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, [days]);

  if (user.tipo !== 'superadmin') return null;

  const fmt = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('es-BO', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 flex-wrap gap-2">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-yellow-500" />
          Estadísticas de Uso
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {DAY_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setDays(o.value)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition ${
                days === o.value
                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {o.label}
            </button>
          ))}
          <button
            onClick={fetchStats}
            className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-[10px] font-bold px-2 py-1 rounded-lg transition"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center items-center py-20">
          <RefreshCw className="w-8 h-8 text-yellow-500 animate-spin" />
        </div>
      ) : !data ? null : (
        <>
          {/* ── Overview Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { icon: <Users className="w-4 h-4" />, label: 'Usuarios Activos', value: data.overview.totalUsers, color: 'text-yellow-500' },
              { icon: <Target className="w-4 h-4" />, label: 'Pronósticos Total', value: data.overview.totalPredictions, color: 'text-green-400' },
              { icon: <Trophy className="w-4 h-4" />, label: 'Partidos Finalizados', value: data.overview.finishedMatches, color: 'text-blue-400' },
              { icon: <Activity className="w-4 h-4" />, label: 'Eventos (período)', value: data.overview.totalEvents, color: 'text-purple-400' },
              { icon: <TrendingUp className="w-4 h-4" />, label: 'Ingresos Hoy', value: data.overview.todayLogins, color: 'text-orange-400' },
            ].map(s => (
              <div key={s.label} className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 flex flex-col items-center gap-1">
                <span className={`${s.color}`}>{s.icon}</span>
                <span className={`text-2xl font-black ${s.color}`}>{s.value.toLocaleString()}</span>
                <span className="text-[9px] text-neutral-500 uppercase tracking-widest text-center leading-tight">{s.label}</span>
              </div>
            ))}
          </div>

          {/* ── Gráfico: Actividad diaria ── */}
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">Actividad Diaria</h4>
              <div className="flex flex-wrap gap-2">
                {(['acceso', 'pronostico', 'usuario', 'mensaje', 'registro'] as const).map(k => (
                  <button
                    key={k}
                    onClick={() => setActiveSeries(p => ({ ...p, [k]: !p[k] }))}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                      activeSeries[k]
                        ? 'opacity-100 border-transparent'
                        : 'opacity-40 border-transparent'
                    }`}
                    style={{ color: CATEGORY_COLORS[k.toUpperCase()] }}
                  >
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: CATEGORY_COLORS[k.toUpperCase()] }} />
                    {CATEGORY_LABELS[k.toUpperCase()]}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dailyEvents} style={CHART_STYLE}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="date" tickFormatter={fmt} tick={{ fill: '#737373', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#737373', fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(d: any) => fmt(String(d))}
                    formatter={(val: any, name: any) => [val, CATEGORY_LABELS[String(name).toUpperCase()] || String(name)]}
                  />
                  {activeSeries.acceso && <Line type="monotone" dataKey="acceso" stroke={CATEGORY_COLORS.ACCESO} strokeWidth={2} dot={false} name="acceso" />}
                  {activeSeries.pronostico && <Line type="monotone" dataKey="pronostico" stroke={CATEGORY_COLORS.PRONOSTICO} strokeWidth={2} dot={false} name="pronostico" />}
                  {activeSeries.usuario && <Line type="monotone" dataKey="usuario" stroke={CATEGORY_COLORS.USUARIO} strokeWidth={2} dot={false} name="usuario" />}
                  {activeSeries.mensaje && <Line type="monotone" dataKey="mensaje" stroke={CATEGORY_COLORS.MENSAJE} strokeWidth={2} dot={false} name="mensaje" />}
                  {activeSeries.registro && <Line type="monotone" dataKey="registro" stroke={CATEGORY_COLORS.REGISTRO} strokeWidth={2} dot={false} name="registro" />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Row: Categorías + Nuevos Usuarios ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Eventos por categoría (pie + bars) */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">Eventos por Categoría</h4>
              {data.byCategory.length === 0 ? (
                <p className="text-neutral-600 text-xs text-center py-8">Sin datos</p>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div style={{ width: 160, height: 160, flexShrink: 0 }}>
                    <PieChart width={160} height={160}>
                      <Pie
                        data={data.byCategory}
                        dataKey="count"
                        nameKey="categoria"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {data.byCategory.map((entry: any) => (
                          <Cell key={entry.categoria} fill={CATEGORY_COLORS[entry.categoria] || '#737373'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(val: any, name: any) => [val, CATEGORY_LABELS[String(name)] || String(name)]}
                      />
                    </PieChart>
                  </div>
                  <div className="flex-1 space-y-1.5 w-full">
                    {data.byCategory.map((c: any) => {
                      const total = data.byCategory.reduce((s: number, r: any) => s + r.count, 0);
                      const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
                      return (
                        <div key={c.categoria} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[c.categoria] || '#737373' }} />
                          <span className="text-[10px] text-neutral-400 w-24 truncate">{CATEGORY_LABELS[c.categoria] || c.categoria}</span>
                          <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[c.categoria] || '#737373' }} />
                          </div>
                          <span className="text-[10px] font-bold text-neutral-300 w-8 text-right">{c.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Nuevos usuarios por día */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">Nuevos Usuarios por Día</h4>
              {data.newUsers.length === 0 ? (
                <p className="text-neutral-600 text-xs text-center py-8">Sin nuevos usuarios en este período</p>
              ) : (
                <div style={{ width: '100%', height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.newUsers} style={CHART_STYLE}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="date" tickFormatter={fmt} tick={{ fill: '#737373', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#737373', fontSize: 10 }} tickLine={false} axisLine={false} width={24} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} labelFormatter={(d: any) => fmt(String(d))} formatter={(val: any) => [val, 'Nuevos usuarios']} />
                      <Bar dataKey="count" name="Nuevos usuarios" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* ── Pronósticos por Partido ── */}
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">Pronósticos por Partido (Top 15)</h4>
            {data.predictionsPerMatch.length === 0 ? (
              <p className="text-neutral-600 text-xs text-center py-8">Sin datos</p>
            ) : (
              <div className="space-y-1.5">
                {data.predictionsPerMatch.map((m: any, i: number) => {
                  const max = data.predictionsPerMatch[0]?.count || 1;
                  const pct = max > 0 ? (m.count / max) * 100 : 0;
                  const stateColor = m.estado === 'live' ? 'text-red-400' : m.estado === 'finished' ? 'text-green-400' : 'text-neutral-500';
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-neutral-600 w-4 text-right">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold text-neutral-200 truncate">{m.local} vs {m.visitante}</span>
                          {m.score && <span className={`text-[9px] font-mono font-bold ${stateColor}`}>{m.score}</span>}
                          <span className="text-[9px] text-neutral-600 truncate hidden sm:inline">{m.fase}</span>
                        </div>
                        <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-[11px] font-black text-neutral-200 w-6 text-right">{m.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Top Usuarios ── */}
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">Top Usuarios por Pronósticos</h4>
            {data.topUsers.length === 0 ? (
              <p className="text-neutral-600 text-xs text-center py-8">Sin datos</p>
            ) : (
              <>
                <div className="hidden sm:block" style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topUsers.slice(0, 10)} layout="vertical" style={CHART_STYLE}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#737373', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="nombre" tick={{ fill: '#a3a3a3', fontSize: 10 }} tickLine={false} axisLine={false} width={90} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(val: any, name: any) => [val, String(name) === 'predictions' ? 'Pronósticos' : 'Puntos']}
                      />
                      <Legend formatter={(val) => val === 'predictions' ? 'Pronósticos' : 'Puntos'} wrapperStyle={{ fontSize: 10, color: '#737373' }} />
                      <Bar dataKey="predictions" name="predictions" fill="#22c55e" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="puntos" name="puntos" fill="#eab308" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Mobile: simple list */}
                <div className="sm:hidden space-y-1.5">
                  {data.topUsers.slice(0, 8).map((u: any, i: number) => {
                    const max = data.topUsers[0]?.predictions || 1;
                    return (
                      <div key={u.nombre} className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-neutral-600 w-4">{i + 1}</span>
                        <span className="text-[10px] text-neutral-300 flex-1 truncate">{u.nombre}</span>
                        <div className="w-20 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${(u.predictions / max) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-green-400 w-5 text-right">{u.predictions}</span>
                        <span className="text-[10px] font-bold text-yellow-500 w-8 text-right">{u.puntos}pts</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ── Row: Ingresos por hora + Anticipación pronósticos ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Ingresos por hora del día */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-yellow-500" />
                Ingresos por Hora del Día
              </h4>
              {data.loginsByHour.every((h: any) => h.count === 0) ? (
                <p className="text-neutral-600 text-xs text-center py-8">Sin datos de ingresos en este período</p>
              ) : (
                <>
                  <div className="hidden sm:block" style={{ width: '100%', height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.loginsByHour} style={CHART_STYLE}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#737373', fontSize: 9 }}
                          tickLine={false}
                          axisLine={false}
                          interval={2}
                        />
                        <YAxis tick={{ fill: '#737373', fontSize: 10 }} tickLine={false} axisLine={false} width={24} allowDecimals={false} />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(val: any) => [val, 'Ingresos']}
                        />
                        <Bar dataKey="count" name="Ingresos" radius={[3, 3, 0, 0]}>
                          {data.loginsByHour.map((entry: any, index: number) => {
                            // Highlight peak hours (6am-12pm golden, 12-20 yellow, rest dim)
                            const h = entry.hour;
                            const color = h >= 6 && h < 12 ? '#f97316' : h >= 12 && h < 20 ? '#eab308' : '#404040';
                            return <Cell key={index} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Mobile: mini heatmap-style */}
                  <div className="sm:hidden">
                    <div className="grid grid-cols-12 gap-0.5">
                      {data.loginsByHour.map((h: any) => {
                        const max = Math.max(...data.loginsByHour.map((x: any) => x.count), 1);
                        const intensity = max > 0 ? h.count / max : 0;
                        const bg = h.count === 0
                          ? 'bg-neutral-800'
                          : intensity > 0.7 ? 'bg-yellow-500' : intensity > 0.3 ? 'bg-yellow-700' : 'bg-yellow-900';
                        return (
                          <div key={h.hour} className={`aspect-square rounded-sm ${bg} flex items-center justify-center`} title={`${h.label}: ${h.count}`}>
                            <span className="text-[7px] text-neutral-300 font-bold">{h.hour}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[9px] text-neutral-600 mt-1">
                      <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {[...data.loginsByHour].sort((a: any, b: any) => b.count - a.count).slice(0, 3).map((h: any) => (
                        <div key={h.hour} className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-yellow-500 w-12">{h.label}</span>
                          <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(h.count / Math.max(...data.loginsByHour.map((x: any) => x.count), 1)) * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-neutral-300">{h.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-[9px] text-neutral-600 text-center">
                    Hora pico: {data.loginsByHour.reduce((max: any, h: any) => h.count > (max?.count ?? -1) ? h : max, null)?.label ?? '-'}
                  </p>
                </>
              )}
            </div>

            {/* Anticipación de pronósticos */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-green-400" />
                Anticipación al Registrar Pronósticos
              </h4>
              {!data.predBeforeMatch?.length ? (
                <p className="text-neutral-600 text-xs text-center py-8">Sin datos</p>
              ) : (
                <>
                  <div style={{ width: '100%', height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.predBeforeMatch} style={CHART_STYLE}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                        <XAxis dataKey="bucket" tick={{ fill: '#737373', fontSize: 9 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#737373', fontSize: 10 }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(val: any) => [val, 'Pronósticos']} />
                        <Bar dataKey="count" name="Pronósticos" radius={[4, 4, 0, 0]}>
                          {data.predBeforeMatch.map((entry: any, i: number) => {
                            const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#737373'];
                            return <Cell key={i} fill={colors[i] ?? '#737373'} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1">
                    {(() => {
                      const total = data.predBeforeMatch.reduce((s: number, r: any) => s + r.count, 0);
                      const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#737373'];
                      return data.predBeforeMatch.map((b: any, i: number) => (
                        <div key={b.bucket} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i] ?? '#737373' }} />
                          <span className="text-[10px] text-neutral-400 w-20">{b.bucket}</span>
                          <div className="flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${total > 0 ? (b.count / total) * 100 : 0}%`, backgroundColor: colors[i] ?? '#737373' }} />
                          </div>
                          <span className="text-[10px] font-bold text-neutral-300 w-8 text-right">{b.count}</span>
                          <span className="text-[9px] text-neutral-600 w-8 text-right">{total > 0 ? Math.round((b.count / total) * 100) : 0}%</span>
                        </div>
                      ));
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Lectura de Mensajes ── */}
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 space-y-4">
            <h4 className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-purple-400" />
              Estadísticas de Mensajes / Notificaciones
            </h4>
            {data.messageStats.totalSent === 0 ? (
              <p className="text-neutral-600 text-xs text-center py-8">Sin mensajes enviados en este período</p>
            ) : (
              <div className="space-y-4">
                {/* Global read rate */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-black text-purple-400">{data.messageStats.totalSent}</div>
                      <div className="text-[9px] text-neutral-500 uppercase tracking-widest">Enviados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-green-400">{data.messageStats.totalLeidas}</div>
                      <div className="text-[9px] text-neutral-500 uppercase tracking-widest">Leídos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-yellow-500">{data.messageStats.globalReadPct}%</div>
                      <div className="text-[9px] text-neutral-500 uppercase tracking-widest">Tasa Lectura</div>
                    </div>
                  </div>
                  {/* Global progress bar */}
                  <div className="flex-1 w-full space-y-1">
                    <div className="flex justify-between text-[9px] text-neutral-500">
                      <span>Leídos</span><span>{data.messageStats.globalReadPct}%</span>
                    </div>
                    <div className="h-3 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${data.messageStats.globalReadPct}%`,
                          background: `linear-gradient(90deg, #a855f7, #22c55e)`
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* By type */}
                {data.messageStats.byType.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Por tipo de mensaje</p>
                    {data.messageStats.byType.map((t: any) => {
                      const typeColor: Record<string, string> = { info: '#3b82f6', success: '#22c55e', warning: '#f97316', error: '#ef4444' };
                      const color = typeColor[t.tipo] ?? '#a3a3a3';
                      const typeLabel: Record<string, string> = { info: 'Informativo', success: 'Éxito', warning: 'Advertencia', error: 'Error' };
                      return (
                        <div key={t.tipo} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-[10px] text-neutral-400 w-24">{typeLabel[t.tipo] || t.tipo}</span>
                          <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${t.pct}%`, backgroundColor: color }} />
                          </div>
                          <div className="flex gap-2 text-[10px] font-mono">
                            <span className="text-neutral-500">{t.sent} env.</span>
                            <span className="flex items-center gap-0.5" style={{ color }}>
                              <CheckCheck className="w-3 h-3" /> {t.leidas}
                            </span>
                            <span className="font-bold" style={{ color }}>{t.pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
