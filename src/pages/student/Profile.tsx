import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { ResumeViewerModal } from '@/components/ResumeViewerModal';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import {
  User, GraduationCap, Plus, X, Save, FileText, Upload, Eye,
  Mail, Briefcase, Loader2, RefreshCw, CheckCircle2, AlertCircle
} from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } } };

const Profile = () => {
  const { user, detectedSkills, updateSkills, handleFileUpload, isAnalyzing, hasProfile, isSyncing, resumeProfile, updateEducation } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [education, setEducation] = useState(resumeProfile?.degree || '');
  const [university, setUniversity] = useState(resumeProfile?.university || '');
  const [manualSkillInput, setManualSkillInput] = useState('');
  const [localSkills, setLocalSkills] = useState<string[]>([]);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize local skills from detected
  useEffect(() => {
    setLocalSkills(detectedSkills);
  }, [detectedSkills]);

  useEffect(() => {
    if (resumeProfile) {
      if (resumeProfile.degree) setEducation(resumeProfile.degree);
      if (resumeProfile.university) setUniversity(resumeProfile.university);
    }
  }, [resumeProfile]);

  // Fetch resume URL + education
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('student_profiles')
      .select('resume_url, experience_summary')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.resume_url) setResumeUrl(data.resume_url);
      });
  }, [user?.id, hasProfile]);

  const handleAddSkill = () => {
    if (!manualSkillInput.trim()) return;
    const skill = manualSkillInput.trim();
    if (!localSkills.some(s => s.toLowerCase() === skill.toLowerCase())) {
      setLocalSkills(prev => [...prev, skill]);
    }
    setManualSkillInput('');
  };

  const handleRemoveSkill = (skill: string) => {
    setLocalSkills(prev => prev.filter(s => s !== skill));
  };

  const handleSaveSkills = async () => {
    setSaving(true);
    updateSkills(localSkills);
    // Tiny delay to show loading state
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const [savingEdu, setSavingEdu] = useState(false);
  const [saveEduSuccess, setSaveEduSuccess] = useState(false);

  const handleSaveEducation = async () => {
    setSavingEdu(true);
    await updateEducation(education, university);
    setSavingEdu(false);
    setSaveEduSuccess(true);
    setTimeout(() => setSaveEduSuccess(false), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const result = await handleFileUpload(file);
    if (!result.success) {
      setUploadError(result.error || 'Upload failed');
    } else {
      supabase
        .from('student_profiles')
        .select('resume_url')
        .eq('user_id', user?.id)
        .single()
        .then(({ data }) => { if (data?.resume_url) setResumeUrl(data.resume_url); });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const skillsChanged = JSON.stringify(localSkills.sort()) !== JSON.stringify(detectedSkills.sort());

  if (isSyncing) return <DashboardSkeleton />;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl mx-auto space-y-6 pb-12">
      <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />

      {/* Resume Modal */}
      {resumeUrl && (
        <ResumeViewerModal
          isOpen={showResumeModal}
          onClose={() => setShowResumeModal(false)}
          resumeUrl={resumeUrl}
          candidateName={user?.name}
        />
      )}

      {/* Header */}
      <motion.div variants={item} className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium">Manage your resume, skills, and education</p>
      </motion.div>

      {/* Profile Card */}
      <motion.div variants={item} className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold tracking-tight">{user?.name}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Mail className="w-3.5 h-3.5" /> {user?.email}
            </div>
          </div>
          <div className="flex-shrink-0 text-right hidden sm:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</p>
            <p className="text-sm font-bold text-primary capitalize mt-0.5">{user?.role}</p>
          </div>
        </div>
      </motion.div>

      {/* Resume Section */}
      <motion.div variants={item} className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Resume
          </h2>
          <div className="flex gap-2">
            {resumeUrl && (
              <button
                onClick={() => setShowResumeModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-sm font-semibold hover:border-primary/50 transition-colors"
              >
                <Eye className="w-4 h-4" /> View
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {isAnalyzing ? 'Analyzing...' : hasProfile ? 'Update' : 'Upload'}
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 text-sm text-destructive font-medium mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}

        {hasProfile ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-foreground">Resume uploaded</p>
              <p className="text-xs text-muted-foreground">Your resume has been analyzed and skills extracted.</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-12 border-2 border-dashed border-border hover:border-primary/50 rounded-xl flex flex-col items-center gap-3 transition-colors group"
          >
            <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Click to upload PDF</p>
              <p className="text-xs text-muted-foreground mt-1">Max 5MB</p>
            </div>
          </button>
        )}
      </motion.div>

      {/* Skills Section */}
      <motion.div variants={item} className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-secondary" /> Skills ({localSkills.length})
          </h2>
          {skillsChanged && (
            <button
              onClick={handleSaveSkills}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
            </button>
          )}
        </div>

        {/* Add skill */}
        <div className="flex gap-2 mb-4">
          <input
            value={manualSkillInput}
            onChange={e => setManualSkillInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
            placeholder="Add a skill..."
            className="glass-input flex-1 px-4 py-2.5 text-sm focus:outline-none"
          />
          <button
            onClick={handleAddSkill}
            disabled={!manualSkillInput.trim()}
            className="px-4 py-2.5 bg-secondary/10 text-secondary border border-secondary/20 rounded-xl hover:bg-secondary/20 transition-colors disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Skills grid */}
        {localSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {localSkills.map(skill => (
              <motion.span
                key={skill}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-lg bg-card border border-border shadow-sm group hover:border-destructive/30 transition-colors"
              >
                {skill}
                <button
                  onClick={() => handleRemoveSkill(skill)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.span>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-border rounded-xl bg-muted/10">
            <Briefcase className="w-8 h-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-foreground">No skills added yet</p>
            <p className="text-xs text-muted-foreground mt-1">Upload a resume to auto-detect, or add manually above.</p>
          </div>
        )}
      </motion.div>

      {/* Education Section */}
      <motion.div variants={item} className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-accent" /> Education
          </h2>
          {(education !== (resumeProfile?.degree || '') || university !== (resumeProfile?.university || '')) && (
            <button
              onClick={handleSaveEducation}
              disabled={savingEdu}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {savingEdu ? <Loader2 className="w-4 h-4 animate-spin" /> : saveEduSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {savingEdu ? 'Saving...' : saveEduSuccess ? 'Saved!' : 'Save Changes'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Degree</label>
            <input
              value={education}
              onChange={e => setEducation(e.target.value)}
              placeholder="e.g. B.Tech Computer Science"
              className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">University</label>
            <input
              value={university}
              onChange={e => setUniversity(e.target.value)}
              placeholder="e.g. Stanford University"
              className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Profile;
