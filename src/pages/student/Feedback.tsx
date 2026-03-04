import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { AlertTriangle, TrendingUp, FileText, BookOpen, CheckCircle2, XCircle, Clock, Activity } from 'lucide-react';
import { ApplicationTimeline } from '@/components/ApplicationTimeline';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } },
};

const Feedback = () => {
  const { applications, jobs, user } = useApp();
  const myApps = applications.filter(a => a.studentEmail === user?.email);

  const statusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle2 className="w-5 h-5 text-success" />;
    if (status === 'rejected') return <XCircle className="w-5 h-5 text-destructive" />;
    return <Clock className="w-5 h-5 text-warning" />;
  };

  const statusLabel = (status: string) => {
    if (status === 'approved') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    return 'Pending Review';
  };

  if (myApps.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary" /> My Activity
          </h1>
          <p className="text-muted-foreground mt-1">Track your applications and transparency feedback</p>
        </div>
        <div className="elevated-card p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-1">No applications yet</p>
          <p className="text-muted-foreground text-sm">Apply to jobs to see your activity and feedback here!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="w-7 h-7 text-primary" /> My Activity
        </h1>
        <p className="text-muted-foreground mt-1">Transparent insights on every application</p>
      </div>

      {/* Summary stats */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: myApps.length, color: 'text-primary' },
          { label: 'Approved', value: myApps.filter(a => a.status === 'approved').length, color: 'text-success' },
          { label: 'Pending', value: myApps.filter(a => a.status === 'pending').length, color: 'text-warning' },
        ].map(s => (
          <motion.div key={s.label} variants={item} className="elevated-card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {myApps.map((app) => {
          const job = jobs.find(j => j.id === app.jobId);
          const fb = app.feedback;
          if (!fb || !job) return null;

          return (
            <motion.div key={app.id} variants={item} className="elevated-card overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-border/30 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{job.title}</h3>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {statusIcon(app.status)}
                  <span className={app.status === 'approved' ? 'text-success' : app.status === 'rejected' ? 'text-destructive' : 'text-warning'}>
                    {statusLabel(app.status)}
                  </span>
                </div>
              </div>

              {/* Application Timeline */}
              <div className="p-6 border-b border-border/30">
                <ApplicationTimeline currentStatus={app.status} appliedAt={app.appliedAt} />
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Skill Gaps */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    Skill Gaps
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {fb.skillGaps.length > 0 ? fb.skillGaps.map(s => (
                      <motion.span
                        key={s}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-xs px-3 py-1.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30 glow-border-destructive"
                      >
                        Missing: {s}
                      </motion.span>
                    )) : (
                      <span className="text-xs text-success">All skills matched!</span>
                    )}
                  </div>

                  {app.status === 'rejected' && fb.rejectionReasons && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold text-destructive">Rejection Reasons:</p>
                      {fb.rejectionReasons.map((r, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <XCircle className="w-3 h-3 text-destructive" /> {r}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Score Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Score Breakdown
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Keyword Match', value: fb.keywordScore, color: 'bg-primary' },
                      { label: 'Formatting', value: fb.formatScore, color: 'bg-accent' },
                      { label: 'Overall', value: fb.overallScore, color: 'bg-success' },
                    ].map((bar) => (
                      <div key={bar.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{bar.label}</span>
                          <span className="font-mono font-medium">{bar.value}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${bar.value}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                            className={`h-full rounded-full ${bar.color}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Growth Roadmap */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <BookOpen className="w-4 h-4 text-accent" />
                    Growth Roadmap
                  </div>
                  <div className="space-y-2">
                    {fb.suggestions.map((sug, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + i * 0.15 }}
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                      >
                        <span className="mt-0.5 w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                          {i + 1}
                        </span>
                        {sug}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default Feedback;
