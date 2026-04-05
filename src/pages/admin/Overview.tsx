import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, BarChart3, Building2, Sparkles, ArrowRight, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RecruiterAnalytics } from '@/components/AnalyticsCharts';
import { StatusBadge } from '@/components/StatusBadge';
import { CardSkeleton } from '@/components/LoadingSkeleton';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 150, damping: 20 } },
};

const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 800;
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

const AdminOverview = () => {
  const { applications, jobs, user, isSyncing } = useApp();
  const navigate = useNavigate();

  const myJobs = jobs.filter(j => j.created_by === user?.id || !j.created_by);
  const myJobsIds = myJobs.map(j => j.id);
  const myApps = applications.filter(a => myJobsIds.includes(a.jobId));

  const stats = {
    total: myApps.length,
    selected: myApps.filter(a => a.status === 'selected' || a.status === 'approved').length,
    rejected: myApps.filter(a => a.status === 'rejected').length,
    inProcess: myApps.filter(a => ['applied', 'screened', 'shortlisted', 'interview'].includes(a.status)).length,
  };

  const avgScore = myApps.length > 0
    ? Math.round(myApps.reduce((sum, a) => sum + (a.resumeScore || 0), 0) / myApps.length)
    : 0;

  const selectionRate = myApps.length > 0
    ? Math.round((stats.selected / myApps.length) * 100)
    : 0;

  const statCards = [
    { icon: Users, label: 'Total Applicants', value: stats.total, accent: 'text-primary bg-primary/10 border-primary/20', onClick: () => navigate('/admin/applicants') },
    { icon: CheckCircle2, label: 'Selected', value: stats.selected, accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', onClick: () => navigate('/admin/applicants') },
    { icon: XCircle, label: 'Rejected', value: stats.rejected, accent: 'text-red-400 bg-red-500/10 border-red-500/20', onClick: () => navigate('/admin/applicants') },
    { icon: Clock, label: 'In Process', value: stats.inProcess, accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20', onClick: () => navigate('/admin/applicants') },
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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Company Header */}
      <motion.div variants={item} className="bg-card border border-border rounded-2xl p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-border">
          <Building2 className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Transparently <Sparkles className="w-5 h-5 text-primary" />
          </h1>
          <p className="text-muted-foreground text-sm">Recruitment Dashboard</p>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <div className="text-center">
            <p className="text-xl font-bold text-primary">{avgScore}%</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg Score</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-emerald-400">{selectionRate}%</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Selection Rate</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid — 4 cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <motion.div
            key={s.label}
            variants={item}
            whileHover={{ y: -3, scale: 1.01 }}
            onClick={s.onClick}
            className="bg-card border border-border rounded-2xl p-5 cursor-pointer group hover:shadow-md transition-all"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 border ${s.accent}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-3xl font-bold mb-0.5"><AnimatedNumber value={s.value} /></p>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Active Postings */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-accent" /> Active Postings
          </h2>
          {myJobs.length > 6 && (
            <button onClick={() => navigate('/admin/jobs')} className="btn-view-more text-xs">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myJobs.slice(0, 6).map((job, i) => {
            const jobApps = applications.filter(a => a.jobId === job.id);
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -3 }}
                onClick={() => navigate('/admin/active-postings')}
                className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
                    <Briefcase className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.company}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {job.skills.slice(0, 3).map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">{s}</span>
                  ))}
                  {job.skills.length > 3 && <span className="text-[10px] text-muted-foreground">+{job.skills.length - 3}</span>}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
                  <span>{jobApps.length} applicant{jobApps.length !== 1 ? 's' : ''}</span>
                  <span className="text-amber-400 font-medium">{jobApps.filter(a => ['applied', 'screened'].includes(a.status)).length} pending</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Applications */}
      <motion.div variants={item} className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Recent Applications</h2>
          {myApps.length > 5 && (
            <button onClick={() => navigate('/admin/applicants')} className="btn-view-more text-xs">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {myApps.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No applications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myApps.slice(0, 5).map((app) => {
              const job = jobs.find(j => j.id === app.jobId);
              return (
                <div key={app.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/10 border border-border/50 hover:bg-muted/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{app.studentName}</p>
                    <p className="text-xs text-muted-foreground truncate">{job?.title} at {job?.company}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-mono font-bold text-primary">{app.resumeScore}%</span>
                    <StatusBadge status={app.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Analytics Charts */}
      <motion.div variants={item}>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Analytics
        </h2>
        <RecruiterAnalytics />
      </motion.div>
    </motion.div>
  );
};

export default AdminOverview;
