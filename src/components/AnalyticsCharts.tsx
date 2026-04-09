import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const PALETTE = {
  blue:    '#3b82f6',
  cyan:    '#06b6d4',
  purple:  '#8b5cf6',
  amber:   '#f59e0b',
  emerald: '#10b981',
  red:     '#ef4444',
};

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(222 47% 8%)',
    border: '1px solid hsl(217 32% 18%)',
    borderRadius: '10px',
    fontSize: '12px',
    color: 'hsl(210 40% 88%)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  },
  cursor: { fill: 'rgba(100,120,180,0.08)' },
};

// Light-mode tooltip override
const tooltipStyleLight = {
  contentStyle: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '12px',
    color: '#1e293b',
    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
  },
  cursor: { fill: 'rgba(100,120,180,0.05)' },
};

function useIsDark() {
  return !document.documentElement.classList.contains('light');
}

interface AnalyticsChartsProps {
  className?: string;
}

export function RecruiterAnalytics({ className }: AnalyticsChartsProps) {
  const { applications, jobs } = useApp();
  const isDark = useIsDark();
  const tt = isDark ? tooltipStyle : tooltipStyleLight;
  const gridColor = isDark ? 'hsl(217 32% 16%)' : 'hsl(214 32% 91%)';
  const tickColor = isDark ? 'hsl(215 20% 55%)' : 'hsl(215 16% 47%)';

  // Status distribution
  const statusData = [
    { name: 'Applied',     value: applications.filter(a => a.status === 'applied').length,     color: PALETTE.blue },
    { name: 'Screened',    value: applications.filter(a => a.status === 'screened').length,    color: PALETTE.cyan },
    { name: 'Shortlisted', value: applications.filter(a => a.status === 'shortlisted').length, color: PALETTE.purple },
    { name: 'Interview',   value: applications.filter(a => a.status === 'interview').length,   color: PALETTE.amber },
    { name: 'Selected',    value: applications.filter(a => ['selected','approved'].includes(a.status)).length, color: PALETTE.emerald },
    { name: 'Rejected',    value: applications.filter(a => a.status === 'rejected').length,   color: PALETTE.red },
  ].filter(d => d.value > 0);

  // Applicants per job
  const jobData = jobs
    .map(job => ({
      name: job.title.length > 14 ? job.title.slice(0, 14) + '…' : job.title,
      applicants: applications.filter(a => a.jobId === job.id).length,
    }))
    .filter(d => d.applicants > 0)
    .sort((a, b) => b.applicants - a.applicants)
    .slice(0, 6);

  // Score distribution
  const scoreRanges = [
    { range: '0–20',   count: applications.filter(a => (a.resumeScore||0) <= 20).length,                                   color: PALETTE.red },
    { range: '21–40',  count: applications.filter(a => (a.resumeScore||0) > 20  && (a.resumeScore||0) <= 40).length,      color: PALETTE.amber },
    { range: '41–60',  count: applications.filter(a => (a.resumeScore||0) > 40  && (a.resumeScore||0) <= 60).length,      color: PALETTE.cyan },
    { range: '61–80',  count: applications.filter(a => (a.resumeScore||0) > 60  && (a.resumeScore||0) <= 80).length,      color: PALETTE.blue },
    { range: '81–100', count: applications.filter(a => (a.resumeScore||0) > 80).length,                                   color: PALETTE.emerald },
  ];

  // Top skills
  const skillCounts: Record<string, number> = {};
  jobs.forEach(job => (job.skills || []).forEach(s => {
    const k = s.trim(); if (k) skillCounts[k] = (skillCounts[k] || 0) + 1;
  }));
  const topSkills = Object.entries(skillCounts)
    .map(([skill, count]) => ({ skill, display: skill.length > 16 ? skill.slice(0, 16) + '…' : skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);
  const maxSkillCount = topSkills[0]?.count || 1;

  const skillColors = [PALETTE.blue, PALETTE.purple, PALETTE.cyan, PALETTE.emerald, PALETTE.amber, PALETTE.red, '#ec4899'];

  const ChartCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-6"
    >
      <h3 className="text-base font-bold">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </motion.div>
  );

  const EmptyChart = ({ msg }: { msg: string }) => (
    <div className="flex flex-col items-center justify-center py-8 opacity-40">
      <p className="text-sm font-medium text-muted-foreground">{msg}</p>
    </div>
  );

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-5 ${className}`}>

      {/* ── Donut: Pipeline Status ── */}
      <ChartCard title="Pipeline Status" subtitle="Distribution across all application stages">
        <div className="h-52">
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={58} outerRadius={82}
                  paddingAngle={3} dataKey="value" stroke="none">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip {...tt} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart msg="No applications yet" />}
        </div>
        {statusData.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 justify-center">
            {statusData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="text-xs text-muted-foreground">{d.name} <strong className="text-foreground">{d.value}</strong></span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      {/* ── Bar: Applicants per Job ── */}
      <ChartCard title="Applicants per Job" subtitle="Top postings by application volume">
        <div className="h-52">
          {jobData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jobData} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip {...tt} />
                <Bar dataKey="applicants" radius={[6, 6, 0, 0]}>
                  {jobData.map((_, i) => (
                    <Cell key={i} fill={[PALETTE.blue, PALETTE.purple, PALETTE.cyan, PALETTE.emerald, PALETTE.amber, PALETTE.red][i % 6]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart msg="No jobs with applicants yet" />}
        </div>
      </ChartCard>

      {/* ── Bar: Score Distribution ── */}
      <ChartCard title="Resume Score Distribution" subtitle="How candidates rank by ATS match score">
        <div className="h-52">
          {applications.some(a => (a.resumeScore || 0) > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreRanges} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="range" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip {...tt} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {scoreRanges.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart msg="No scored applications yet" />}
        </div>
      </ChartCard>

      {/* ── Horizontal: Top Skills in Demand ── */}
      <ChartCard title="Top Skills in Demand" subtitle="Most required skills across your active job postings">
        {topSkills.length > 0 ? (
          <div className="space-y-3.5">
            {topSkills.map((item, i) => {
              const pct = Math.round((item.count / maxSkillCount) * 100);
              const color = skillColors[i % skillColors.length];
              return (
                <motion.div
                  key={item.skill}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-xs font-semibold text-muted-foreground w-24 text-right flex-shrink-0 truncate"
                    title={item.skill}>{item.display}</span>
                  <div className="flex-1 h-6 bg-muted/25 rounded-md overflow-hidden relative">
                    <motion.div
                      className="h-full rounded-md absolute left-0 top-0"
                      style={{ background: `linear-gradient(90deg, ${color}bb, ${color}55)` }}
                      initial={{ width: '0%' }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.75, delay: i * 0.08, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-xs font-bold w-8 flex-shrink-0 text-right" style={{ color }}>×{item.count}</span>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground opacity-60">
            Post jobs with skills to see demand insights
          </div>
        )}
      </ChartCard>

    </div>
  );
}

export default RecruiterAnalytics;
