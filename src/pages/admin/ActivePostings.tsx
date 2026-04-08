import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { Briefcase, X, Users, Clock, MapPin, Trash2, ArrowLeft, BarChart3 } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 120 } },
};

const ActivePostings = () => {
  const { jobs, applications, deleteJob, user } = useApp();
  const [selectedJob, setSelectedJob] = useState<typeof jobs[0] | null>(null);

  const myJobs = jobs.filter(j => j.created_by === user?.id || !j.created_by);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Active Postings</h1>
        <p className="text-muted-foreground mt-1">All job postings and detailed views</p>
      </div>

      <AnimatePresence mode="wait">
        {selectedJob ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <button
              onClick={() => setSelectedJob(null)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to all postings
            </button>

            <motion.div
              layoutId={`job-card-${selectedJob.id}`}
              className="elevated-card p-8"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                    <Briefcase className="w-8 h-8 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedJob.title}</h2>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                      <MapPin className="w-4 h-4" /> {selectedJob.company}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { deleteJob(selectedJob.id); setSelectedJob(null); }}
                  className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Job Details Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Full Description</h3>
                    <p className="text-sm leading-relaxed">{selectedJob.criteria || 'No description provided.'}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Required Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.skills.map(s => (
                        <span key={s} className="text-xs px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/20">{s}</span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="elevated-card p-4">
                      <p className="text-xs text-muted-foreground mb-1">Salary Range</p>
                      <p className="text-sm font-semibold">
                        {selectedJob.salary_min ? `$${(selectedJob.salary_min/1000).toFixed(0)}k – $${(selectedJob.salary_max!/1000).toFixed(0)}k` : 'Not specified'}
                      </p>
                    </div>
                    <div className="elevated-card p-4">
                      <p className="text-xs text-muted-foreground mb-1">Location</p>
                      <p className="text-sm font-semibold">{selectedJob.location || 'Remote'}</p>
                    </div>
                  </div>

                  <div className="elevated-card p-4">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Posted</p>
                    <p className="text-sm font-semibold">{new Date(selectedJob.postedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> Applicant Stats
                  </h3>
                  {(() => {
                    const jobApps = applications.filter(a => a.jobId === selectedJob.id);
                    const target = 10;
                    const ratio = Math.min(jobApps.length / target, 1);
                    return (
                      <div className="elevated-card p-5 space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Applicants vs Target</span>
                          <span className="font-mono font-bold text-primary">{jobApps.length}/{target}</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${ratio * 100}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-3 rounded-lg bg-muted/30">
                            <p className="text-lg font-bold text-warning">{jobApps.filter(a => ['applied', 'screened'].includes(a.status)).length}</p>
                            <p className="text-[10px] text-muted-foreground">Pending</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted/30">
                            <p className="text-lg font-bold text-success">{jobApps.filter(a => a.status === 'selected').length}</p>
                            <p className="text-[10px] text-muted-foreground">Selected</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted/30">
                            <p className="text-lg font-bold text-destructive">{jobApps.filter(a => a.status === 'rejected').length}</p>
                            <p className="text-[10px] text-muted-foreground">Rejected</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {myJobs.map((job) => {
              const jobApps = applications.filter(a => a.jobId === job.id);
              return (
                <motion.div
                  key={job.id}
                  variants={item}
                  layoutId={`job-card-${job.id}`}
                  whileHover={{ y: -4 }}
                  onClick={() => setSelectedJob(job)}
                  className="elevated-card p-5 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground">{job.company}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteJob(job.id); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {job.skills.slice(0, 3).map(s => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">{s}</span>
                    ))}
                    {job.skills.length > 3 && <span className="text-[10px] text-muted-foreground">+{job.skills.length - 3}</span>}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/30">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {jobApps.length} applicants</span>
                    <span className="text-primary font-medium">{jobApps.filter(a => ['applied', 'screened'].includes(a.status)).length} pending</span>
                  </div>
                </motion.div>
              );
            })}
            {myJobs.length === 0 && (
              <div className="col-span-full elevated-card p-12 text-center">
                <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No active postings</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActivePostings;
