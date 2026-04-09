import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  Users, Briefcase, Building2, Sparkles, ArrowRight,
  CheckCircle2, XCircle, Clock, Star, Target,
  TrendingUp, FileText, Award, ChevronRight, Zap, BarChart3
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { RecruiterAnalytics } from '@/components/AnalyticsCharts';
import { StatusBadge } from '@/components/StatusBadge';
import { CardSkeleton } from '@/components/LoadingSkeleton';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 140, damping: 18 } },
};

const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 900;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setDisplay(Math.round(p * value));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <>{display}</>;
};

// Hiring Funnel bars
const HiringFunnel = ({ stats }: { stats: { total: number; inProcess: number; selected: number } }) => {
  const stages = [
    { label: 'Applied',   count: stats.total,     color: '#3b82f6', pct: 100 },
    { label: 'In Review', count: stats.inProcess,  color: '#f59e0b', pct: stats.total > 0 ? Math.max(8, (stats.inProcess / stats.total) * 100) : 0 },
    { label: 'Selected',  count: stats.selected,   color: '#10b981', pct: stats.total > 0 ? Math.max(4, (stats.selected  / stats.total) * 100) : 0 },
  ];
  return (
    <div className="space-y-3">
      {stages.map((s, i) => (
        <div key={s.label} className="flex items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground w-16 text-right flex-shrink-0">{s.label}</span>
          <div className="flex-1 h-8 bg-muted/25 rounded-lg overflow-hidden relative">
            <motion.div
              className="h-full absolute left-0 top-0 rounded-lg flex items-center justify-end pr-3"
              style={{ background: `linear-gradient(90deg, ${s.color}cc, ${s.color}77)` }}
              initial={{ width: '0%' }}
              animate={{ width: `${s.pct}%` }}
              transition={{ duration: 0.85, delay: i * 0.12 + 0.15, ease: 'easeOut' }}
            >
              <span className="text-xs font-bold text-white drop-shadow">{s.count}</span>
            </motion.div>
          </div>
          <span className="text-xs text-muted-foreground w-8 flex-shrink-0 font-semibold">
            {stats.total > 0 && i > 0 ? `${Math.round((s.count / stats.total) * 100)}%` : ''}
          </span>
        </div>
      ))}
    </div>
  );
};

const AdminOverview = () => {
  const { applications, jobs, user, isSyncing } = useApp();
  const navigate = useNavigate();

  const myJobs = jobs.filter(j => j.created_by === user?.id || !j.created_by);
  const myJobsIds = myJobs.map(j => j.id);
  const myApps = applications.filter(a => myJobsIds.includes(a.jobId));

  const stats = {
    total: myApps.length,
    selected: myApps.filter(a => ['selected', 'approved'].includes(a.status as string)).length,
    rejected: myApps.filter(a => a.status === 'rejected').length,
    inProcess: myApps.filter(a => ['applied', 'screened', 'shortlisted', 'interview'].includes(a.status as string)).length,
  };

  const avgScore = myApps.length > 0
    ? Math.round(myApps.reduce((sum, a) => sum + (a.resumeScore || 0), 0) / myApps.length)
    : 0;

  const selectionRate = myApps.length > 0
    ? Math.round((stats.selected / myApps.length) * 100)
    : 0;

  const topCandidates = [...myApps]
    .filter(a => (a.resumeScore || 0) > 0)
    .sort((a, b) => (b.resumeScore || 0) - (a.resumeScore || 0))
    .slice(0, 5);

  const statCards = [
    {
      icon: Users, label: 'Total Applicants', value: stats.total,
      accent: '#3b82f6',
      onClick: () => navigate('/admin/applicants'),
    },
    {
      icon: CheckCircle2, label: 'Selected', value: stats.selected,
      accent: '#10b981',
      onClick: () => navigate('/admin/applicants'),
    },
    {
      icon: XCircle, label: 'Rejected', value: stats.rejected,
      accent: '#ef4444',
      onClick: () => navigate('/admin/applicants'),
    },
    {
      icon: Clock, label: 'In Process', value: stats.inProcess,
      accent: '#f59e0b',
      onClick: () => navigate('/admin/applicants'),
    },
  ];

  if (isSyncing) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 pb-8">

      {/* ── HERO HEADER ── */}
      <motion.div variants={item} className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ background: 'linear-gradient(135deg, hsl(221 83% 53% / 0.07) 0%, transparent 60%, hsl(175 70% 41% / 0.04) 100%)' }} />
        {/* Glow blob */}
        <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-20"
          style={{ background: 'hsl(221 83% 53%)' }} />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Brand */}
          <div className="flex items-center gap-4 flex-1">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-primary/25 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, hsl(221 83% 53% / 0.18), hsl(175 70% 41% / 0.12))' }}>
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                Transparently
                <Sparkles className="w-5 h-5 text-primary" />
              </h1>
              <p className="text-sm text-muted-foreground">Recruitment Command Center</p>
            </div>
          </div>

          {/* KPI Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl border" style={{ borderColor: 'hsl(221 83% 53% / 0.25)', background: 'hsl(221 83% 53% / 0.07)' }}>
              <Target className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-2xl font-black text-primary leading-none">{avgScore}%</p>
                <p className="text-[11px] font-bold text-muted-foreground mt-0.5 uppercase tracking-wide">Avg Score</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl border" style={{ borderColor: '#10b98133', background: '#10b98110' }}>
              <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: '#10b981' }} />
              <div>
                <p className="text-2xl font-black leading-none" style={{ color: '#10b981' }}>{selectionRate}%</p>
                <p className="text-[11px] font-bold text-muted-foreground mt-0.5 uppercase tracking-wide">Hire Rate</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-border bg-card/60">
              <Briefcase className="w-4 h-4 text-accent flex-shrink-0" />
              <div>
                <p className="text-2xl font-black leading-none">{myJobs.length}</p>
                <p className="text-[11px] font-bold text-muted-foreground mt-0.5 uppercase tracking-wide">Active Jobs</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <motion.div
            key={s.label}
            variants={item}
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={s.onClick}
            className="relative overflow-hidden bg-card border border-border rounded-2xl p-5 cursor-pointer group transition-all duration-300 hover:shadow-lg"
          >
            {/* Subtle hover glow */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: `radial-gradient(ellipse at top left, ${s.accent}12, transparent 70%)` }} />

            {/* Icon + Number row */}
            <div className="relative flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0"
                style={{ background: `${s.accent}15`, borderColor: `${s.accent}30` }}>
                <s.icon className="w-5 h-5" style={{ color: s.accent }} />
              </div>
            </div>

            {/* Number */}
            <p className="relative text-4xl font-black mb-1 leading-none" style={{ color: s.accent }}>
              <AnimatedNumber value={s.value} />
            </p>

            {/* Label */}
            <p className="relative text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>

            {/* Hover arrow */}
            <ChevronRight className="absolute bottom-4 right-4 w-4 h-4 opacity-0 group-hover:opacity-40 transition-opacity"
              style={{ color: s.accent }} />
          </motion.div>
        ))}
      </div>

      {/* ── HIRING FUNNEL + TOP CANDIDATES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Hiring Funnel */}
        <motion.div variants={item} className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-primary/20"
              style={{ background: 'hsl(221 83% 53% / 0.1)' }}>
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold">Hiring Funnel</h2>
              <p className="text-xs text-muted-foreground">Conversion across pipeline stages</p>
            </div>
          </div>
          {myApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-5 opacity-50 select-none">
              <Target className="w-9 h-9 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">No applications yet</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Applications appear once candidates apply</p>
            </div>
          ) : (
            <>
              <HiringFunnel stats={stats} />
              <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-muted-foreground">
                    <span className="font-bold text-amber-400">{stats.inProcess}</span> awaiting review
                  </span>
                </div>
                <button onClick={() => navigate('/admin/applicants')}
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1">
                  Review <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </>
          )}
        </motion.div>

        {/* Top Candidates */}
        <motion.div variants={item} className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-amber-500/20"
                style={{ background: '#f59e0b15' }}>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-bold">Top Candidates</h2>
                <p className="text-xs text-muted-foreground">Ranked by ATS resume score</p>
              </div>
            </div>
            {myApps.length > 5 && (
              <button onClick={() => navigate('/admin/applicants')} className="btn-view-more text-xs">
                All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {topCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-5 opacity-50 select-none">
              <Star className="w-9 h-9 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">No scored candidates yet</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Scores appear after resume analysis</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topCandidates.map((app, idx) => {
                const job = jobs.find(j => j.id === app.jobId);
                const score = app.resumeScore || 0;
                const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : '#f59e0b';
                const medals = ['🥇', '🥈', '🥉'];

                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.07 }}
                    onClick={() => navigate('/admin/applicants')}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-border hover:bg-muted/10 transition-all cursor-pointer group"
                  >
                    <span className="text-base w-6 flex-shrink-0 text-center">{medals[idx] || `${idx + 1}`}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{app.studentName}</p>
                      <p className="text-xs text-muted-foreground truncate">{job?.title}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-black" style={{ color: scoreColor }}>{score}%</span>
                      <StatusBadge status={app.status} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── ACTIVE POSTINGS ── */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-accent/20"
              style={{ background: 'hsl(175 70% 41% / 0.1)' }}>
              <Briefcase className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold">Active Postings</h2>
              <p className="text-xs text-muted-foreground">{myJobs.length} live job{myJobs.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {myJobs.length > 6 && (
            <button onClick={() => navigate('/admin/jobs')} className="btn-view-more text-xs">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {myJobs.length === 0 ? (
          <div className="bg-card border border-dashed border-border/60 rounded-2xl py-8 text-center">
            <Briefcase className="w-9 h-9 text-muted-foreground/25 mx-auto mb-2" />
            <p className="text-sm font-semibold text-muted-foreground">No active postings</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">Create a job to start receiving applications</p>
            <button onClick={() => navigate('/admin/jobs')}
              className="mt-3 text-sm text-primary hover:underline font-semibold">
              + Create Job Posting
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myJobs.slice(0, 6).map((job, i) => {
              const jobApps = applications.filter(a => a.jobId === job.id);
              const pending = jobApps.filter(a => ['applied', 'screened'].includes(a.status)).length;
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -3 }}
                  onClick={() => navigate('/admin/active-postings')}
                  className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-accent/40 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-accent/20 flex-shrink-0"
                      style={{ background: 'hsl(175 70% 41% / 0.1)' }}>
                      <Briefcase className="w-4 h-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate group-hover:text-accent transition-colors">{job.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{job.company}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {job.skills.slice(0, 3).map(s => (
                      <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-accent border border-accent/20"
                        style={{ background: 'hsl(175 70% 41% / 0.08)' }}>{s}</span>
                    ))}
                    {job.skills.length > 3 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/60">
                        +{job.skills.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-3 border-t border-border/40">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <FileText className="w-3 h-3" />
                      <span>{jobApps.length} applicant{jobApps.length !== 1 ? 's' : ''}</span>
                    </div>
                    {pending > 0 ? (
                      <span className="flex items-center gap-1 font-semibold" style={{ color: '#f59e0b' }}>
                        <Clock className="w-3 h-3" />
                        {pending} pending
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">All reviewed</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── ANALYTICS ── */}
      <motion.div variants={item}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-primary/20"
            style={{ background: 'hsl(221 83% 53% / 0.1)' }}>
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold">Analytics</h2>
            <p className="text-xs text-muted-foreground">Pipeline insights and skill demand</p>
          </div>
        </div>
        <RecruiterAnalytics />
      </motion.div>

    </motion.div>
  );
};

export default AdminOverview;
