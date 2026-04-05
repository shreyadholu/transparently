import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp, Application } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { ResumeViewerModal } from '@/components/ResumeViewerModal';
import { StatusBadge } from '@/components/StatusBadge';
import { ListSkeleton } from '@/components/LoadingSkeleton';
import {
  User, CheckCircle2, XCircle, FileText, Search, Shield,
  ArrowLeft, Loader2, Download, Eye, SlidersHorizontal,
  MessageSquare, Send, ChevronDown, Award, Target
} from 'lucide-react';
import { toast } from 'sonner';

const REJECTION_REASONS = [
  'Skill Mismatch',
  'Experience Gap',
  'Missing Keywords',
  'Formatting Issues',
  'Location Mismatch',
  'Overqualified',
  'Insufficient Education',
];

const ApplicantReview = () => {
  const { applications, jobs, user, reviewApplication, updateApplicationStatus, addRecruiterNote, fetchRecruiterNotes, isSyncing } = useApp();
  const [selected, setSelected] = useState<Application | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);
  const [showRejectMenu, setShowRejectMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [loadingResume, setLoadingResume] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [candidateSkills, setCandidateSkills] = useState<string[]>([]);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMinScore, setFilterMinScore] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);

  // Recruiter notes
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  const [savingNote, setSavingNote] = useState(false);

  // Focus on my jobs' applications
  const myJobIds = jobs.filter(j => j.created_by === user?.id || !j.created_by).map(j => j.id);

  const filtered = applications.filter(app => {
    if (!myJobIds.includes(app.jobId)) return false;
    if (!app.studentName || app.studentName.trim() === '') return false;

    // Status filter
    if (filterStatus !== 'all' && app.status !== filterStatus) return false;
    // Score filter
    if (app.resumeScore < filterMinScore) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const job = jobs.find(j => j.id === app.jobId);
    return app.studentName.toLowerCase().includes(q) ||
      app.studentEmail.toLowerCase().includes(q) ||
      (job && job.title.toLowerCase().includes(q));
  }).sort((a, b) => b.resumeScore - a.resumeScore); // Sort by score desc

  const handleSelectCandidate = async (app: Application) => {
    setSelected(app);
    setRejectionReasons([]);
    setShowRejectMenu(false);
    setResumeUrl(null);
    setCandidateSkills([]);
    setLoadingResume(true);

    try {
      // Fetch resume URL
      const { data: profileData } = await supabase
        .from('student_profiles')
        .select('resume_url')
        .eq('user_id', app.studentId)
        .single();

      if (profileData?.resume_url) setResumeUrl(profileData.resume_url);

      // Fetch candidate skills
      const { data: skillsData } = await supabase
        .from('skills')
        .select('skill_name')
        .eq('user_id', app.studentId);

      setCandidateSkills((skillsData || []).map(s => s.skill_name as string));

      // Fetch notes
      const fetchedNotes = await fetchRecruiterNotes(app.id);
      setNotes(fetchedNotes);
    } catch (err) {
      console.error('Error fetching candidate data:', err);
    } finally {
      setLoadingResume(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      toast.error('Invalid application ID');
      return;
    }
    try {
      await updateApplicationStatus(id, 'selected');
      reviewApplication(id, 'selected');
      toast.success('Candidate approved!');
    } catch (err) { console.error(err); }
  };

  const handleAdvanceStage = async (id: string, nextStatus: 'screened' | 'shortlisted' | 'interview') => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      toast.error('Invalid application ID');
      return;
    }
    await updateApplicationStatus(id, nextStatus);
    toast.success(`Application moved to ${nextStatus}`);
  };

  const handleReject = async (id: string) => {
    if (rejectionReasons.length === 0) return;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      toast.error('Invalid application ID');
      return;
    }

    try {
      const { error: appError } = await supabase.from('applications').update({ status: 'rejected' }).eq('id', id);
      if (appError) { toast.error('Failed to update status.'); return; }

      await supabase.from('application_feedback').insert([{
        application_id: id,
        recruiter_notes: rejectionReasons.join(', ')
      }]);

      reviewApplication(id, 'rejected', rejectionReasons);
      setShowRejectMenu(false);
      toast.success('Application declined with feedback.');
    } catch (err) {
      toast.error('An unexpected error occurred.');
      console.error(err);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim() || !selected) return;
    setSavingNote(true);
    await addRecruiterNote(selected.studentId, selected.id, noteText.trim());
    const updatedNotes = await fetchRecruiterNotes(selected.id);
    setNotes(updatedNotes);
    setNoteText('');
    setSavingNote(false);
    toast.success('Note saved');
  };

  const toggleReason = (reason: string) => {
    setRejectionReasons(prev => prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]);
  };

  const getNextStage = (status: string): { label: string; value: 'screened' | 'shortlisted' | 'interview' } | null => {
    const map: Record<string, { label: string; value: 'screened' | 'shortlisted' | 'interview' }> = {
      applied: { label: 'Move to Screened', value: 'screened' },
      screened: { label: 'Shortlist', value: 'shortlisted' },
      shortlisted: { label: 'Schedule Interview', value: 'interview' },
    };
    return map[status] || null;
  };

  // ── Loading state ──
  if (isSyncing) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Applicant Review</h1></div>
        <ListSkeleton rows={5} />
      </div>
    );
  }

  // ── Detail View ──
  if (selected) {
    const job = jobs.find(j => j.id === selected.jobId);
    const nextStage = getNextStage(selected.status);
    const isActionable = ['applied', 'screened', 'shortlisted', 'interview'].includes(selected.status);

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Resume Modal */}
        {resumeUrl && (
          <ResumeViewerModal
            isOpen={showResumeModal}
            onClose={() => setShowResumeModal(false)}
            resumeUrl={resumeUrl}
            candidateName={selected.studentName}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Applicants
          </button>
          <div className="flex gap-2">
            {isActionable && (
              <>
                {nextStage && (
                  <button onClick={() => handleAdvanceStage(selected.id, nextStage.value)} className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-primary/20 transition-colors">
                    <Award className="w-4 h-4" /> {nextStage.label}
                  </button>
                )}
                {selected.status === 'interview' && (
                  <button onClick={() => handleApprove(selected.id)} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors">
                    <Shield className="w-4 h-4" /> Select Candidate
                  </button>
                )}
                <button onClick={() => setShowRejectMenu(!showRejectMenu)} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-destructive/20 hover:bg-destructive/90 transition-colors">
                  <XCircle className="w-4 h-4" /> Decline
                </button>
              </>
            )}
            {!isActionable && (
              <StatusBadge status={selected.status} size="md" />
            )}
          </div>
        </div>

        {/* Reject Menu */}
        <AnimatePresence>
          {showRejectMenu && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="bg-card border border-destructive/30 rounded-xl p-4 flex gap-4 items-end">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive mb-2">Select rejection reasons:</p>
                  <div className="flex flex-wrap gap-2">
                    {REJECTION_REASONS.map(reason => (
                      <button key={reason} onClick={() => toggleReason(reason)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        rejectionReasons.includes(reason) ? 'bg-destructive/20 text-destructive border-destructive/40' : 'bg-muted/30 text-muted-foreground border-border hover:border-destructive/30'
                      }`}>
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => handleReject(selected.id)} disabled={rejectionReasons.length === 0} className="px-6 py-2 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold disabled:opacity-40 transition-opacity whitespace-nowrap">
                  Confirm
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Candidate Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Info */}
          <div className="space-y-4">
            {/* Profile Card */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selected.studentName}</h2>
                  <p className="text-sm text-muted-foreground">{selected.studentEmail}</p>
                </div>
              </div>

              <div className="p-3 bg-muted/20 rounded-lg mb-4">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Applied For</p>
                <p className="font-semibold text-sm text-primary">{job?.title}</p>
                <p className="text-xs text-muted-foreground">{job?.company}</p>
              </div>

              {/* ATS Score */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">ATS Score</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${selected.resumeScore}%` }} className="h-full bg-primary rounded-full" />
                  </div>
                  <span className="text-lg font-mono font-bold text-primary">{selected.resumeScore}%</span>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-secondary" /> Candidate Skills
              </h3>
              {candidateSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {candidateSkills.map(s => {
                    const isMatch = job?.skills.some(js => js.toLowerCase() === s.toLowerCase());
                    return (
                      <span key={s} className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                        isMatch ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-muted/30 text-muted-foreground border-border'
                      }`}>
                        {s} {isMatch && '✓'}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No skills data available</p>
              )}
            </div>

            {/* View Resume Button */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-primary" /> Resume
              </h3>
              {loadingResume ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </div>
              ) : resumeUrl ? (
                <button
                  onClick={() => setShowResumeModal(true)}
                  className="w-full py-3 rounded-xl bg-primary/10 text-primary border border-primary/20 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors"
                >
                  <Eye className="w-4 h-4" /> View Resume
                </button>
              ) : (
                <p className="text-xs text-muted-foreground">No resume uploaded</p>
              )}
            </div>
          </div>

          {/* Right: Notes + Feedback */}
          <div className="lg:col-span-2 space-y-4">
            {/* Rejection feedback if rejected */}
            {selected.feedback?.rejectionReasons && (
              <div className="bg-card border border-destructive/20 rounded-xl p-5">
                <h3 className="text-sm font-bold text-destructive flex items-center gap-2 mb-3">
                  <XCircle className="w-4 h-4" /> Rejection Feedback
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selected.feedback.rejectionReasons.map((r, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20">{r}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Recruiter Notes */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-accent" /> Internal Notes
              </h3>

              {/* Add note */}
              <div className="flex gap-2 mb-4">
                <input
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveNote()}
                  placeholder="Add a note about this candidate..."
                  className="glass-input flex-1 px-4 py-2.5 text-sm focus:outline-none"
                />
                <button
                  onClick={handleSaveNote}
                  disabled={!noteText.trim() || savingNote}
                  className="px-4 py-2.5 bg-accent text-accent-foreground rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-40 transition-opacity"
                >
                  {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>

              {/* Notes list */}
              {notes.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {notes.map(note => (
                    <div key={note.id} className="p-3 rounded-lg bg-muted/20 border border-border/50">
                      <p className="text-sm text-foreground">{note.note}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No notes yet</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── List View ──
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Applicant Review</h1>
        <p className="text-muted-foreground mt-1 text-sm">Review candidates for your active postings</p>
      </div>

      {/* Search + Filter Bar */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or job..."
              className="glass-input w-full pl-10 pr-4 py-2.5 text-sm focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors border ${
              showFilters ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-muted-foreground border-border hover:border-primary/30'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Status</label>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="glass-input px-3 py-2 text-sm appearance-none pr-8 min-w-[140px]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="applied">Applied</option>
                    <option value="screened">Screened</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interview">Interview</option>
                    <option value="selected">Selected</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Min Score</label>
                  <input
                    type="number"
                    min={0} max={100}
                    value={filterMinScore}
                    onChange={e => setFilterMinScore(Number(e.target.value))}
                    className="glass-input px-3 py-2 text-sm w-24"
                    placeholder="0"
                  />
                </div>
                <button
                  onClick={() => { setFilterStatus('all'); setFilterMinScore(0); }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Clear filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {(searchQuery || filterStatus !== 'all' || filterMinScore > 0) && (
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {applications.filter(a => myJobIds.includes(a.jobId)).length} applicants
          </p>
        )}
      </div>

      {/* Applicant List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-16 text-center">
            <FileText className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-1">No applicants found</h3>
            <p className="text-muted-foreground text-sm">Candidates who apply to your jobs will appear here.</p>
          </div>
        ) : (
          filtered.map((app, i) => {
            const job = jobs.find(j => j.id === app.jobId);
            return (
              <motion.button
                key={app.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => handleSelectCandidate(app)}
                className="w-full text-left p-4 rounded-xl bg-card border border-border flex items-center gap-4 group hover:border-primary/30 hover:bg-muted/10 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{app.studentName}</p>
                  <p className="text-xs text-muted-foreground truncate">{job?.title} · {job?.company}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs font-mono font-bold text-foreground/70">{app.resumeScore}%</span>
                  <StatusBadge status={app.status} />
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ApplicantReview;
