import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { getJobMatch } from '@/lib/resumeAnalysis';
import { useNavigate } from 'react-router-dom';
import { Briefcase, MapPin, Clock, CheckCircle2, Sparkles, User, TrendingUp, ArrowRight, Search, Filter, X, Loader2, RefreshCw } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 120 } },
};

const JobBoard = () => {
  const { jobs, applications, applyToJob, user, detectedSkills, isSyncing, syncJobsFromSupabase } = useApp();
  const navigate = useNavigate();
  const [selectedJob, setSelectedJob] = useState<typeof jobs[0] | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Fetch jobs from Supabase on mount
  useEffect(() => {
    const fetchJobs = async () => {
      setLoadingJobs(true);
      try {
        // Use the sync function from AppContext to fetch and update jobs
        await syncJobsFromSupabase();
      } catch (err) {
        console.error("Error fetching jobs:", err);
      } finally {
        setLoadingJobs(false);
      }
    };
    fetchJobs();
  }, [syncJobsFromSupabase]);

  // Get all unique skills from jobs
  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    jobs.forEach(j => j.skills.forEach(s => skills.add(s)));
    return Array.from(skills).sort();
  }, [jobs]);

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query ||
        job.title.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query) ||
        job.skills.some(s => s.toLowerCase().includes(query));
      const matchesSkills = selectedSkills.length === 0 ||
        selectedSkills.some(s => job.skills.some(js => js.toLowerCase() === s.toLowerCase()));
      return matchesSearch && matchesSkills;
    });
  }, [jobs, searchQuery, selectedSkills]);

  const toggleSkillFilter = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const hasApplied = (jobId: string) =>
    applications.some(a => a.jobId === jobId && a.studentEmail === user?.email);

  // FIX: Use detectedSkills from AppContext for match score calculation
  // Score = (Number of Matched Skills / Total Job Skills) * 100
  const getMatchScore = (jobSkills: string[]) => {
    if (detectedSkills.length === 0) return 0;
    const matched = detectedSkills.filter(s => jobSkills.some(js => js.toLowerCase() === s.toLowerCase()));
    return Math.round((matched.length / Math.max(jobSkills.length, 1)) * 100);
  };

  const handleOpenSheet = (job: typeof jobs[0]) => {
    setSelectedJob(job);
    setSheetOpen(true);
    setShowSuccess(false);
  };

  const handleConfirmApply = async () => {
    if (!selectedJob || !user?.id) return;

    try {
      // Calculate resume score based on skill matching
      const matchedSkills = user.skills.filter(s => 
        selectedJob.skills.some(js => js.toLowerCase() === s.toLowerCase())
      );
      const calculatedScore = Math.round((matchedSkills.length / Math.max(selectedJob.skills.length, 1)) * 100);

      // Insert application into Supabase
      const { data: appData, error: appError } = await supabase.from("applications").insert([
        {
          job_id: selectedJob.id,
          student_id: user.id,
          status: "under_review",
          score: calculatedScore
        }
      ]).select();

      if (appError) {
        console.error("Error applying to job:", appError);
        return;
      }

      // Also update local state
      applyToJob(selectedJob.id);
      setShowSuccess(true);
      setTimeout(() => {
        setSheetOpen(false);
        setShowSuccess(false);
        setSelectedJob(null);
        navigate('/student/activity');
      }, 2000);
    } catch (err) {
      console.error("Error in application process:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Job Board</h1>
        <p className="text-muted-foreground mt-1">Discover opportunities that match your skills</p>
      </div>

      {/* Task 3: Syncing with Profile loading state */}
      {isSyncing && (
        <div className="flex items-center gap-2 px-4 py-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          <span className="text-primary">Syncing with Profile...</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title, company, or skill..."
              className="glass-input w-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              showFilters || selectedSkills.length > 0
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'glass-input text-muted-foreground hover:text-foreground'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filter {selectedSkills.length > 0 && `(${selectedSkills.length})`}
          </motion.button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="elevated-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">Filter by Skills</p>
                  {selectedSkills.length > 0 && (
                    <button onClick={() => setSelectedSkills([])} className="text-xs text-primary hover:underline">Clear all</button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {allSkills.map(skill => (
                    <button
                      key={skill}
                      onClick={() => toggleSkillFilter(skill)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        selectedSkills.includes(skill)
                          ? 'bg-primary/20 text-primary border-primary/40'
                          : 'bg-muted/30 text-muted-foreground border-border/30 hover:border-primary/30'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {(searchQuery || selectedSkills.length > 0) && (
          <p className="text-xs text-muted-foreground">
            Showing {filteredJobs.length} of {jobs.length} jobs
          </p>
        )}
      </div>

      {loadingJobs ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading jobs...</span>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredJobs.map((job) => {
            const applied = hasApplied(job.id);
            return (
              <motion.div
                key={job.id}
                variants={item}
                whileHover={{ y: -4 }}
                className="elevated-card p-6 flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{job.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {job.company}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> New
                  </span>
                </div>

                <p className="text-sm text-muted-foreground mb-4">{job.criteria}</p>

                <div className="flex flex-wrap gap-2 mb-5">
                  {job.skills.map((skill) => {
                    // Task 3: Use getJobMatch for deterministic matching with synonym support
                    const matchedSkills = getJobMatch(job.skills, detectedSkills);
                    const isMatch = matchedSkills.some(s => s.toLowerCase() === skill.toLowerCase());
                    return (
                      <span 
                        key={skill} 
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          isMatch 
                            ? 'bg-success/10 text-success border-success/20' // Success style (Green)
                            : 'bg-muted/30 text-muted-foreground border-border/30' // Neutral style (Gray)
                        }`}
                      >
                        {skill}
                      </span>
                    );
                  })}
                </div>

                <div className="mt-auto">
                  {applied ? (
                    <div className="flex items-center gap-2 text-success text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Applied
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOpenSheet(job)}
                      className="w-full py-2.5 bg-primary/10 text-primary border border-primary/30 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" /> Apply Now
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
          {filteredJobs.length === 0 && (
            <div className="col-span-full elevated-card p-12 text-center">
              <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No jobs match your search criteria</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Apply Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-card/95 backdrop-blur-xl border-l border-border/50 p-0 overflow-y-auto">
          <SheetTitle className="sr-only">Apply to Position</SheetTitle>
          <div className="p-6 h-full">
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col items-center justify-center text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="w-24 h-24 rounded-full bg-success/20 border-2 border-success/40 flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-12 h-12 text-success" />
                  </motion.div>
                  <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-2xl font-bold mb-2">Application Sent!</motion.h2>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-muted-foreground">Redirecting to My Activity...</motion.p>
                </motion.div>
              ) : selectedJob ? (
                <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h2 className="text-lg font-bold">Apply to Position</h2>
                  <div className="elevated-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{selectedJob.title}</h3>
                        <p className="text-sm text-muted-foreground">{selectedJob.company}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedJob.criteria}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedJob.skills.map((skill) => {
                        // Task 3: Use getJobMatch for deterministic matching with synonym support
                        const matchedSkills = getJobMatch(selectedJob.skills, detectedSkills);
                        const isMatch = matchedSkills.some(s => s.toLowerCase() === skill.toLowerCase());
                        return (
                          <span 
                            key={skill} 
                            className={`text-xs px-2 py-1 rounded-full border ${
                              isMatch 
                                ? 'bg-success/10 text-success border-success/20' // Success style (Green)
                                : 'bg-muted/50 text-muted-foreground border-border/30' // Neutral style (Gray)
                            }`}
                          >
                            {skill}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="elevated-card p-5">
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Quick Profile Review</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Name</span><span className="font-medium">{user?.name}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Email</span><span className="font-medium">{user?.email}</span></div>
{/* FIX: Check detectedSkills.length > 0 instead of user?.resumeUploaded */}
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Resume</span><span className={`font-medium ${detectedSkills.length > 0 ? 'text-success' : 'text-warning'}`}>{detectedSkills.length > 0 ? 'Uploaded' : 'Not uploaded'}</span></div>
{/* FIX: Use detectedSkills from AppContext - show user's detected skills with job matching */}
                      <div className="pt-2">
                        <span className="text-sm text-muted-foreground">Your Skills</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {detectedSkills.length > 0 ? detectedSkills.map(s => {
                            const isMatch = selectedJob.skills.some(js => js.toLowerCase() === s.toLowerCase());
                            return <span key={s} className={`text-xs px-2 py-1 rounded-full border ${isMatch ? 'bg-success/10 text-success border-success/20' : 'bg-muted/50 text-muted-foreground border-border/30'}`}>{s} {isMatch && '✓'}</span>;
                          }) : <span className="text-xs text-muted-foreground">No skills detected - upload a resume to see your skills</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="elevated-card p-5">
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-accent" /> Pre-Apply Match Score</h4>
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20">
                        <svg viewBox="0 0 80 80" className="-rotate-90 w-20 h-20">
                          <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                          <motion.circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" strokeDasharray={201} initial={{ strokeDashoffset: 201 }} animate={{ strokeDashoffset: 201 - (getMatchScore(selectedJob.skills) / 100) * 201 }} transition={{ duration: 1, ease: 'easeOut' }} style={{ filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.5))' }} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">{getMatchScore(selectedJob.skills)}%</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{getMatchScore(selectedJob.skills) >= 70 ? 'Strong Match' : getMatchScore(selectedJob.skills) >= 40 ? 'Moderate Match' : 'Building Match'}</p>
{/* FIX: Use detectedSkills for matched skills count */}
                        <p className="text-xs text-muted-foreground mt-1">{detectedSkills.filter(s => selectedJob.skills.some(js => js.toLowerCase() === s.toLowerCase())).length} of {selectedJob.skills.length} required skills matched</p>
                      </div>
                    </div>
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleConfirmApply} className="w-full py-4 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/25 transition-shadow">
                    Confirm Application <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default JobBoard;

