import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { ApplicationTimeline } from '@/components/ApplicationTimeline';
import { ListSkeleton, Skeleton } from '@/components/LoadingSkeleton';
import {
  Activity, FileText, ChevronDown, TrendingUp, BookOpen,
  AlertTriangle, CheckCircle2, XCircle, Target, Briefcase, Calendar
} from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 250, damping: 25 } },
};

const Feedback = () => {
  const { applications, jobs, user, isSyncing } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const myApps = applications.filter(a => a.studentId === user?.id || a.studentEmail === user?.email);

  const totalCount = myApps.length;
  const selectedCount = myApps.filter(a => a.status === 'selected').length;
  const rejectedCount = myApps.filter(a => a.status === 'rejected').length;
  const activeCount = myApps.filter(a => ['applied', 'screened', 'shortlisted', 'interview'].includes(a.status)).length;

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  if (isSyncing) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="border-b border-border pb-5">
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
           <Skeleton className="h-20 w-full rounded-2xl" />
           <Skeleton className="h-20 w-full rounded-2xl" />
           <Skeleton className="h-20 w-full rounded-2xl" />
           <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
        <ListSkeleton rows={5} />
      </div>
    );
  }

  if (myApps.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="border-b border-border pb-5">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
            <Activity className="w-6 h-6 text-primary" /> My Activity
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Track your applications and feedback</p>
        </div>
        <div className="bg-card border border-border shadow-sm rounded-2xl p-12 md:p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-5 border border-dashed border-border">
             <FileText className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-xl font-bold text-foreground mb-1">No applications yet</p>
          <p className="text-muted-foreground text-sm max-w-[320px]">Apply to jobs to see your activity, track your pipeline, and receive feedback.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2 text-foreground">
            <Activity className="w-6 h-6 text-primary" /> My Activity
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Transparent insights on every application you make.</p>
        </div>
      </div>

      {/* Summary stats */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Total Apps', value: totalCount, color: 'text-foreground', bg: 'bg-card border-border' },
          { label: 'In Pipeline', value: activeCount, color: 'text-blue-500', bg: 'bg-card border-blue-500/20' },
          { label: 'Selected', value: selectedCount, color: 'text-emerald-500', bg: 'bg-card border-emerald-500/20' },
          { label: 'Rejected', value: rejectedCount, color: 'text-red-500', bg: 'bg-card border-red-500/20' },
        ].map((s, i) => (
          <motion.div variants={item} key={s.label} className={`${s.bg} border rounded-xl p-4 md:p-5 text-center shadow-sm hover:shadow-md transition-shadow`}>
            <p className={`text-2xl md:text-3xl font-bold tracking-tight mb-0.5 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Application List */}
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
        <div className="flex items-center justify-between px-1 mb-1 relative">
           <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Application History</h2>
           <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">{myApps.length}</span>
        </div>
        
        {myApps.map((app) => {
          const job = jobs.find(j => j.id === app.jobId);
          const fb = app.feedback;
          const isExpanded = expandedId === app.id;
          if (!job) return null;

          return (
            <motion.div key={app.id} variants={item} className={`bg-card border rounded-xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-primary/40 shadow-md ring-1 ring-primary/20' : 'border-border shadow-sm hover:border-primary/20 hover:shadow'}`}>
              {/* Compact Row */}
              <button
                onClick={() => toggleExpand(app.id)}
                className="w-full flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 transition-colors text-left focus:outline-none"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 hidden sm:flex">
                     <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="font-semibold text-base text-foreground truncate mb-0.5">{job.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground/80">
                    <span className="font-medium text-foreground/80">{job.company}</span>
                    <span className="hidden sm:inline w-1 h-1 rounded-full bg-border" />
                    <span className="flex items-center gap-1 whitespace-nowrap">
                       <Calendar className="w-3.5 h-3.5" />
                       {new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 sm:w-auto w-full mt-1 sm:mt-0">
                  <StatusBadge status={app.status} size="sm" />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </button>

              {/* Expanded Detail */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden bg-muted/5 border-t border-border/50"
                  >
                    <div className="p-4 md:p-6 space-y-6">
                      {/* Timeline */}
                      <div className="bg-card border border-border/60 rounded-xl p-5 md:p-6 shadow-sm">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Application Timeline</h4>
                        <div className="max-w-3xl mx-auto px-2">
                          <ApplicationTimeline currentStatus={app.status} appliedAt={app.appliedAt} />
                        </div>
                      </div>

                      {/* Rejection Feedback */}
                      {app.status === 'rejected' && fb?.rejectionReasons && fb.rejectionReasons.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-5 rounded-xl bg-destructive/5 border border-destructive/20 relative overflow-hidden shadow-sm">
                          <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
                          <div className="flex items-center gap-2 text-sm font-bold text-destructive mb-3 pl-2">
                            <AlertTriangle className="w-4 h-4" /> Why was I rejected?
                          </div>
                          <div className="flex flex-wrap gap-2 pl-2">
                            {fb.rejectionReasons.map((r, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card border border-destructive/20 text-xs font-bold text-destructive shadow-sm">
                                <XCircle className="w-3.5 h-3.5" /> {r}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* Score + Suggestions Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Score Breakdown */}
                        {fb && (
                          <div className="p-5 rounded-xl bg-card border border-border/80 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground border-b border-border/50 pb-3">
                              <TrendingUp className="w-4 h-4 text-primary" /> ATS Breakdown
                            </div>
                            <div className="space-y-3 pt-1">
                                {[
                                  { label: 'Keyword Match', value: fb.keywordScore, color: 'bg-blue-500' },
                                  { label: 'Formatting', value: fb.formatScore, color: 'bg-purple-500' },
                                  { label: 'Overall Score', value: fb.overallScore, color: 'bg-emerald-500' },
                                ].map(bar => (
                                  <div key={bar.label} className="group">
                                    <div className="flex justify-between text-xs font-bold mb-1.5">
                                      <span className="text-muted-foreground group-hover:text-foreground transition-colors">{bar.label}</span>
                                      <span className="text-foreground">{bar.value}%</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden border border-border/40">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{ width: `${bar.value}%` }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        className={`h-full rounded-full ${bar.color}`}
                                      />
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-5">
                            {/* Skill Gaps */}
                            {fb && (
                              <div className="p-5 rounded-xl border border-border/80 bg-card shadow-sm">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground mb-3 border-b border-border/50 pb-3">
                                  <Target className="w-4 h-4 text-amber-500" /> Skill Match
                                </div>
                                {fb.skillGaps.length > 0 ? (
                                  <div className="pt-1">
                                      <p className="text-xs font-medium text-muted-foreground mb-3">Skills missing from your resume:</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {fb.skillGaps.map(s => (
                                          <span key={s} className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase">
                                            <XCircle className="w-3 h-3" /> {s}
                                          </span>
                                        ))}
                                      </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 pt-2">
                                    <CheckCircle2 className="w-4 h-4" /> You've matched all required keywords!
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Suggestions */}
                            {fb?.suggestions && fb.suggestions.length > 0 && (
                              <div className="p-5 rounded-xl bg-card border border-border/80 shadow-sm">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground mb-4 border-b border-border/50 pb-3">
                                  <BookOpen className="w-4 h-4 text-accent" /> Advice
                                </div>
                                <div className="space-y-2 pt-1">
                                    {fb.suggestions.slice(0, 3).map((sug, i) => (
                                      <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors border border-border/40">
                                        <div className="w-6 h-6 rounded bg-accent/15 text-accent flex items-center justify-center flex-shrink-0 text-xs font-bold border border-accent/20">
                                          {i + 1}
                                        </div>
                                        <p className="text-xs font-medium text-foreground py-0.5 leading-relaxed">{sug}</p>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                        </div>

                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default Feedback;
