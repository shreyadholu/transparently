import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { ApplicationTimeline } from '@/components/ApplicationTimeline';
import { ListSkeleton, Skeleton } from '@/components/LoadingSkeleton';
import {
  Activity, FileText, ChevronDown, TrendingUp, BookOpen,
  AlertTriangle, CheckCircle2, XCircle, Target, Briefcase, Calendar, MessageSquare, Loader2, Shield
} from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 250, damping: 25 } },
};

const REJECTION_ENRICHMENT: Record<string, { detail: string; tip: string }> = {
  'Skills Gap': {
    detail: "Our team analyzed your technical profile and found that while you have strong foundations, some of the specific technical requirements for this role (like specialized frameworks or tools) weren't as prominent as needed.",
    tip: "Focus on building a portfolio project that clearly demonstrates your proficiency with the core stack of the jobs you are targeting. Consider a certification in specialized areas like Cloud Architecture or advanced Frontend patterns."
  },
  'Experience Gap': {
    detail: "For this particular position, we are currently prioritizing candidates who have more hands-on, professional experience in high-growth environments similar to ours.",
    tip: "Consider applying for Junior or Associate level positions, or look for internships that offer a path to full-time roles. Building 6-12 months of professional tenure will significantly boost your profile."
  },
  'Culture Alignment': {
    detail: "We're looking for a specific type of collaboration and communication style that aligns with our current team's growth stage and unique working dynamics.",
    tip: "Try to research the company's public values, blog posts, and team interviews before your next application. Tailoring your 'Soft Skills' and 'Mission' sections to match the company culture can make a big difference."
  },
  'Low ATS Match': {
    detail: "Our automated screening system determined that your resume didn't sufficiently highlight the key Industry Keywords we use to filter qualified applicants for this high-volume role.",
    tip: "Use a clean, single-column resume format. Mirror the job description's language (keywords) in your 'Skills' and 'Experience' sections. Ensure your PDF is text-searchable."
  },
  'Location Conflict': {
    detail: "This role requires a physical presence in the specified office location, and we are currently not offering relocation assistance or fully remote options for this vacancy.",
    tip: "Highlight your willingness to relocate in your profile, or focus your search on remote-first companies or roles within your current geographic region."
  },
  'Education Gap': {
    detail: "This role has specific academic or certification requirements that were not clearly met or listed in your current application profile.",
    tip: "Double check your education section for accuracy. If you are currently enrolled in a degree or certification, mention it clearly with an expected completion date."
  }
};

const Feedback = () => {
  const { applications, jobs, user, isSyncing, fetchRecruiterNotes } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, any[]>>({});
  const [loadingNotes, setLoadingNotes] = useState<Record<string, boolean>>({});

  const myApps = applications.filter(a => a.studentId === user?.id || a.studentEmail === user?.email);

  const toggleExpand = async (id: string) => {
    const isExpanding = expandedId !== id;
    setExpandedId(isExpanding ? id : null);

    if (isExpanding && !notesMap[id]) {
      setLoadingNotes(prev => ({ ...prev, [id]: true }));
      try {
        const notes = await fetchRecruiterNotes(id);
        setNotesMap(prev => ({ ...prev, [id]: notes }));
      } finally {
        setLoadingNotes(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  const totalCount = myApps.length;
  const selectedCount = myApps.filter(a => a.status === 'selected').length;
  const rejectedCount = myApps.filter(a => a.status === 'rejected').length;
  const activeCount = myApps.filter(a => ['applied', 'screened', 'shortlisted', 'interview'].includes(a.status)).length;


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
          { label: 'Total Applications', value: totalCount, color: 'text-foreground', bg: 'bg-card border-border' },
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

                      {/* Enriched Rejection Feedback */}
                      {app.status === 'rejected' && fb?.rejectionReasons && fb.rejectionReasons.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                          <div className="flex items-center gap-2 text-[11px] font-black text-destructive uppercase tracking-widest px-1">
                            <AlertTriangle className="w-4 h-4" /> Application Status: Declined
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            {fb.rejectionReasons.map((r, i) => {
                              const enriched = REJECTION_ENRICHMENT[r];
                              return (
                                <div key={i} className="p-5 md:p-6 rounded-2xl bg-destructive/[0.03] border border-destructive/10 shadow-sm relative overflow-hidden group">
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-full -translate-y-16 translate-x-16 blur-3xl group-hover:bg-destructive/10 transition-all" />

                                  <div className="flex items-center gap-3 mb-4 relative z-10">
                                    <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 shadow-sm">
                                      <XCircle className="w-5 h-5" />
                                    </div>
                                    <h5 className="font-bold text-foreground leading-tight text-base">{r}</h5>
                                  </div>

                                  <div className="space-y-5 relative z-10 sm:pl-12">
                                    <div className="space-y-1.5">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-destructive/60">Recruiter Analysis</p>
                                      <p className="text-sm font-medium text-foreground/80 leading-relaxed italic">
                                        "{enriched?.detail || "After a thorough review, our team decided to move forward with other candidates who more closely align with our current organizational requirements for this role."}"
                                      </p>
                                    </div>

                                    {enriched?.tip && (
                                      <div className="space-y-2 p-4 rounded-xl bg-white/60 border border-emerald-500/10 shadow-sm">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
                                          <TrendingUp className="w-3 h-3" /> Growth Opportunity
                                        </p>
                                        <p className="text-[13px] font-bold text-foreground/70 leading-relaxed">
                                          {enriched.tip}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}

                      {/* Growth Roadmap Content */}
                      {fb?.growthRoadmap && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between px-1">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" /> Personal Growth Roadmap
                            </h4>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-bold text-primary">
                              <Calendar className="w-3.5 h-3.5" /> Est. Time: {fb.growthRoadmap.estimated_time}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                            {/* Learning Steps (Left) */}
                            <div className="lg:col-span-7 space-y-3">
                              {fb.growthRoadmap.steps.map((step, si) => (
                                <div key={si} className="p-4 rounded-xl bg-card border border-border/80 hover:border-primary/30 transition-all group relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/[0.03] rounded-full translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform" />
                                  <div className="flex items-start gap-4 relative z-10">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black text-xs shrink-0">
                                      {si + 1}
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <h5 className="text-sm font-bold text-foreground">{step.title}</h5>
                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border ${step.difficulty === 'Beginner' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                          step.difficulty === 'Intermediate' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            'bg-rose-50 text-rose-600 border-rose-100'
                                          }`}>
                                          {step.difficulty}
                                        </span>
                                      </div>
                                      <p className="text-[13px] text-muted-foreground leading-relaxed">{step.description}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Project Spotlight (Right) */}
                            <div className="lg:col-span-5">
                              <div className="h-full p-6 rounded-2xl bg-gradient-to-br from-primary/[0.03] to-primary/[0.08] border border-primary/20 shadow-sm flex flex-col justify-between group">
                                <div className="space-y-4">
                                  <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-12 transition-transform">
                                    <Target className="w-5 h-5" />
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">Recommended Project</p>
                                    <h5 className="text-lg font-bold text-foreground leading-tight">
                                      {fb.growthRoadmap.project_idea.split(':')[0]}
                                    </h5>
                                    <p className="text-sm text-muted-foreground/90 leading-relaxed font-medium">
                                      {fb.growthRoadmap.project_idea.includes(':')
                                        ? fb.growthRoadmap.project_idea.split(':')[1].trim()
                                        : fb.growthRoadmap.project_idea}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-6 flex items-center gap-2 text-xs font-bold text-primary">
                                  <Shield className="w-4 h-4" /> Certification-Grade Project
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}


                      {/* Recruiter Feedback (Shared from Candidate Feedback in Recruiter Portal) */}
                      <div className="bg-card border border-border/60 rounded-xl p-5 md:p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-primary" /> Recruiter Feedback
                          </h4>
                          <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-lg border border-primary/20">
                            Direct Insights
                          </span>
                        </div>

                        {loadingNotes[app.id] ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading feedback...
                          </div>
                        ) : notesMap[app.id]?.length > 0 ? (
                          <div className="space-y-3">
                            {notesMap[app.id].map((note, ni) => (
                              <div key={ni} className="p-4 rounded-xl bg-muted/20 border border-border/40 hover:border-primary/30 transition-all">
                                <p className="text-sm font-medium text-foreground/90 leading-relaxed italic text-muted-foreground">"{note.note}"</p>
                                <div className="mt-3 flex items-center justify-between">
                                  <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Global Talent Team</span>
                                  <span className="text-[10px] font-bold text-muted-foreground">
                                    {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 bg-muted/10 border border-dashed border-border rounded-xl">
                            <p className="text-xs text-muted-foreground font-medium italic">No direct feedback has been posted by the recruiter yet.</p>
                          </div>
                        )}
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
