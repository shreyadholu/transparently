import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import ResumeScoreRing from '@/components/ResumeScoreRing';
import { ResumeViewerModal } from '@/components/ResumeViewerModal';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import {
  FileText, Target, Briefcase, Upload, Shield,
  Search, Loader2, AlertCircle, CheckCircle2, XCircle,
  Lightbulb, RefreshCw, TrendingUp, Eye
} from 'lucide-react';

// ─── Animation variants ───────────────────────────────────────────────────────
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } } };

// ─── ATS Grade helper ────────────────────────────────────────────────────────
function getGrade(score: number) {
  if (score >= 90) return { label: 'Excellent', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10 border-emerald-500/20' };
  if (score >= 70) return { label: 'Good', colorClass: 'text-primary', bgClass: 'bg-primary/10 border-primary/20' };
  if (score >= 50) return { label: 'Average', colorClass: 'text-amber-400', bgClass: 'bg-amber-500/10 border-amber-500/20' };
  return { label: 'Needs Work', colorClass: 'text-red-400', bgClass: 'bg-red-500/10 border-red-500/20' };
}

// ─── Component ────────────────────────────────────────────────────────────────
const StudentDashboard = () => {
  const { user, applications, jobs, handleFileUpload, isAnalyzing, resumeAnalysisResult, aiAnalysis, detectedSkills, hasProfile, isSyncing, resumeProfile } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localResumeUrl, setLocalResumeUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Fetch resume_url
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('student_profiles')
      .select('resume_url')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.resume_url) setLocalResumeUrl(data.resume_url);
      });
  }, [user?.id, hasProfile]);

  // ─── Derived values ───────────────────────────────────────────────────────
  const resumeScore = aiAnalysis?.overall_score ?? resumeAnalysisResult?.resume_health.overall_score ?? resumeProfile?.resume_score ?? 0;
  const contactScore = aiAnalysis?.contact_info_score ?? resumeAnalysisResult?.structural_integrity.contact_info_score ?? resumeProfile?.contact_score ?? 0;
  const experienceScore = aiAnalysis?.experience_score ?? resumeAnalysisResult?.structural_integrity.experience_headers_score ?? resumeProfile?.experience_score ?? 0;
  const keywordScore = aiAnalysis?.keyword_score ?? resumeAnalysisResult?.structural_integrity.keyword_density_score ?? resumeProfile?.keyword_score ?? 0;
  const skillCoverageScore = aiAnalysis?.skill_coverage_score ?? resumeProfile?.skill_coverage_score ?? 0;

  const displaySkills = (aiAnalysis?.skills && aiAnalysis.skills.length > 0) ? aiAnalysis.skills : detectedSkills.length > 0 ? detectedSkills : user?.skills ?? [];
  const strengths = aiAnalysis?.strengths ?? resumeProfile?.strengths ?? [];
  const weakAreas = aiAnalysis?.weak_areas ?? resumeProfile?.weak_areas ?? [];
  const tips = aiAnalysis?.feedback.suggestions ?? resumeProfile?.improvement_tips ?? [];
  const critIssue = aiAnalysis?.feedback.critical_issue ?? resumeProfile?.critical_issue ?? null;
  const resumeUrl = localResumeUrl;

  const grade = getGrade(resumeScore);
  const myApps = applications.filter(a => a.studentId === user?.id || a.studentEmail === user?.email);
  const appliedCount = myApps.length;
  const approvedCount = myApps.filter(a => a.status === 'selected').length;
  const pendingCount = myApps.filter(a => ['applied', 'screened', 'shortlisted', 'interview'].includes(a.status)).length;
  const hasResume = hasProfile || user?.resumeUploaded;

  // ─── File upload handler ──────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const result = await handleFileUpload(file);
    if (!result.success) {
      setUploadError(result.error || 'Upload failed. Please try again.');
    } else {
      supabase
        .from('student_profiles')
        .select('resume_url')
        .eq('user_id', user?.id)
        .single()
        .then(({ data }) => { if (data?.resume_url) setLocalResumeUrl(data.resume_url); });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const stats = [
    { icon: Briefcase, label: 'Available Jobs', value: jobs.length, onClick: () => navigate('/student/jobs') },
    { icon: FileText, label: 'Applications', value: appliedCount, onClick: () => navigate('/student/activity') },
    { icon: Target, label: 'Shortlisted', value: approvedCount, onClick: undefined },
    { icon: Shield, label: 'In Progress', value: pendingCount, onClick: undefined },
  ];

  // ─── Loading state ────────────────────────────────────────────────────────
  if (isSyncing) return <DashboardSkeleton />;

  // ════════════════════════════════════════════════════════════════════════════
  // EMPTY STATE — No resume uploaded
  // ════════════════════════════════════════════════════════════════════════════
  if (!hasResume && !resumeAnalysisResult && !aiAnalysis) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-5xl mx-auto space-y-8">
        <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />

        <motion.div variants={item} className="flex flex-col gap-1 border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome, {user?.name}</h1>
          <p className="text-muted-foreground font-medium">Upload your resume to begin your career journey.</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} onClick={s.onClick} className={`p-5 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-4 transition-all duration-300 ${s.onClick ? 'cursor-pointer hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5' : ''}`}>
              <div className="w-11 h-11 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
                <s.icon className="w-5 h-5 text-foreground/80" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Upload card */}
        <motion.div variants={item} className="bg-card border border-border shadow-sm rounded-2xl p-8 lg:p-12 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 border border-primary/20">
            <Upload className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-3 text-foreground">Upload your Resume</h2>
          <p className="text-muted-foreground mb-10 max-w-lg leading-relaxed font-medium">
            Our AI ATS scanner will extract your skills, score your formatting, and provide professional suggestions.
          </p>

          {uploadError && (
            <div className="mb-8 w-full max-w-md p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 text-sm text-destructive font-semibold text-left">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {isAnalyzing ? (
            <div className="w-full max-w-md py-12 border-2 border-dashed border-primary/30 bg-primary/5 rounded-2xl flex flex-col items-center gap-5">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-base font-bold text-foreground">Analyzing with AI...</p>
                <p className="text-sm font-medium text-muted-foreground mt-1">Extracting keywords and calculating your score</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-md py-14 border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 rounded-2xl flex flex-col items-center gap-4 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-full bg-background border border-border shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">Click or drag PDF to upload</p>
                <p className="text-sm font-medium text-muted-foreground mt-1.5">Maximum file size 5MB</p>
              </div>
            </button>
          )}
        </motion.div>
      </motion.div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ACTIVE STATE — Full Dashboard
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-8 pb-12">
      <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />

      {/* Resume Viewer Modal */}
      {resumeUrl && (
        <ResumeViewerModal
          isOpen={showResumeModal}
          onClose={() => setShowResumeModal(false)}
          resumeUrl={resumeUrl}
          candidateName={user?.name}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Review your ATS score, detected skills, and feedback.</p>
        </div>
        <div className="flex items-center gap-3">
          {resumeUrl && (
            <button
              onClick={() => setShowResumeModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-card border border-border text-foreground hover:border-primary/50 transition-all"
            >
              <Eye className="w-4 h-4" /> View Resume
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isAnalyzing ? 'Analyzing...' : 'Update Resume'}
          </button>
        </div>
      </motion.div>

      {/* Upload error */}
      {uploadError && (
        <motion.div variants={item} className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 text-sm text-destructive font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </motion.div>
      )}

      {/* Analyzing indicator */}
      {isAnalyzing && (
        <motion.div variants={item} className="p-5 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-5">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div>
            <p className="text-base font-bold text-foreground">AI is scanning your document...</p>
            <p className="text-sm text-muted-foreground mt-0.5">Extracting metrics and determining your ATS score.</p>
          </div>
        </motion.div>
      )}

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} onClick={s.onClick} className={`p-5 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-4 transition-all duration-300 ${s.onClick ? 'cursor-pointer hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5' : ''}`}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-muted border border-border">
              <s.icon className="w-5 h-5 text-foreground/80" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold tracking-tight text-foreground mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Grid Layout ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Score & Sub-scores */}
        <motion.div variants={item} className="lg:col-span-4 space-y-6">
          <div className="bg-card border border-border shadow-sm rounded-2xl p-8 flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />

            <div className="flex items-center justify-between w-full mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> ATS Score
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${grade.bgClass} ${grade.colorClass}`}>
                {grade.label}
              </span>
            </div>

            <ResumeScoreRing score={resumeScore} size={180} strokeWidth={14} />

            {critIssue && (
              <div className="mt-6 w-full p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground font-semibold leading-relaxed">{critIssue}</p>
              </div>
            )}

            {/* Sub-scores */}
            <div className="mt-8 w-full space-y-4">
              {[
                { label: 'Contact Info', score: contactScore },
                { label: 'Experience', score: experienceScore },
                { label: 'Keywords', score: keywordScore },
                { label: 'Skill Coverage', score: skillCoverageScore },
              ].map((m, i) => (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">{m.label}</span>
                    <span className="text-sm font-bold text-foreground">{m.score}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden border border-border/50">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${m.score}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.2 + i * 0.1 }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Column: Skills, Improvement Plan */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Skills Grid */}
          <motion.div variants={item} className="bg-card border border-border border-l-4 border-l-secondary shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Search className="w-4 h-4 text-secondary" /> Detected Skills
              </h2>
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-secondary/10 text-secondary border border-secondary/20">
                {displaySkills.length} Found
              </span>
            </div>

            {displaySkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {displaySkills.map((skill) => (
                  <span key={skill} className="inline-flex items-center text-sm font-medium px-3.5 py-1.5 rounded-lg bg-card text-foreground border border-border shadow-sm hover:border-secondary transition-colors">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-border rounded-xl bg-muted/10">
                <p className="text-base font-semibold text-foreground">No skills detected</p>
                <p className="text-sm text-muted-foreground mt-1">Ensure your resume contains recognizable industry keywords.</p>
              </div>
            )}
          </motion.div>

          {/* Strengths & Weaknesses side-by-side */}
          {(strengths.length > 0 || weakAreas.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {strengths.length > 0 && (
                <motion.div variants={item} className="bg-card border border-border shadow-sm rounded-2xl p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2 pb-3 border-b border-border/50">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Strengths
                  </h2>
                  <ul className="space-y-3">
                    {strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-foreground font-medium leading-relaxed">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {weakAreas.length > 0 && (
                <motion.div variants={item} className="bg-card border border-border shadow-sm rounded-2xl p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2 pb-3 border-b border-border/50">
                    <XCircle className="w-4 h-4 text-red-400" /> Issues Found
                  </h2>
                  <ul className="space-y-3">
                    {weakAreas.map((w, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-foreground font-medium leading-relaxed">
                        <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>
          )}

          {/* Improvement Plan — merged "Areas to Improve" + "Actionable Recommendations" */}
          {tips.length > 0 && (
            <motion.div variants={item} className="bg-card border border-border shadow-sm rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" /> Action Steps
              </h2>
              <div className="space-y-3">
                {tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/20 hover:shadow-sm transition-shadow">
                    <div className="w-6 h-6 rounded-lg bg-card border border-border flex items-center justify-center flex-shrink-0 text-xs font-bold text-foreground">
                      {i + 1}
                    </div>
                    <p className="text-sm font-medium text-foreground leading-relaxed pt-0.5">{tip}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default StudentDashboard;
