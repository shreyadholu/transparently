import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import {
  Upload, Plus, X, UserCircle, FileText, CheckCircle2,
  Loader2, AlertCircle, File, CloudUpload, Sparkles
} from 'lucide-react';

const Profile = () => {
  const { user, updateSkills, handleFileUpload, isAnalyzing, aiAnalysis, detectedSkills } = useApp();

  const [newSkill, setNewSkill] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Education form fields (saved separately to Supabase)
  const [education, setEducation] = useState('');
  const [university, setUniversity] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Load existing education data
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('student_profiles')
      .select('education, university, cgpa')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setEducation(data.education || '');
          setUniversity(data.university || '');
          setCgpa(data.cgpa ? String(data.cgpa) : '');
        }
      });
  }, [user?.id]);

  // Skills — prefer detected skills from context
  const displaySkills = detectedSkills.length > 0 ? detectedSkills : user?.skills ?? [];

  const handleAddSkill = () => {
    if (!newSkill.trim() || !user) return;
    const updated = [...new Set([...displaySkills, newSkill.trim()])];
    updateSkills(updated);
    setNewSkill('');
  };

  const handleRemoveSkill = (skill: string) => {
    if (!user) return;
    updateSkills(displaySkills.filter(s => s !== skill));
  };

  // ─── Drag + Drop ─────────────────────────────────────────────────────────
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const processFile = async (file: File) => {
    setError(null);
    setSuccessMsg(null);
    // Delegate entirely to the AppContext handler (single source of truth)
    const result = await handleFileUpload(file);
    if (result.success) {
      setSuccessMsg('Resume uploaded & analyzed successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setError(result.error || 'Upload failed. Please try again.');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ─── Save education info ──────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setProfileSaving(true);
    const { error: err } = await supabase.from('student_profiles').upsert({
      user_id: user.id,
      education: education || null,
      university: university || null,
      cgpa: cgpa ? parseFloat(cgpa) : null,
    }, { onConflict: 'user_id' });
    setProfileSaving(false);
    if (!err) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    }
  };

  const hasResume = user?.resumeUploaded;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your resume, skills, and education info</p>
      </div>

      {/* ── User Info Card ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.name}</h2>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
            {hasResume && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs text-success font-medium">
                <CheckCircle2 className="w-3 h-3" /> Resume uploaded
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Education Card ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Education Details
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Education Level</label>
            <select
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none"
            >
              <option value="">Select education level</option>
              <option value="High School">High School</option>
              <option value="Associate">Associate Degree</option>
              <option value="Bachelor">Bachelor's Degree</option>
              <option value="Master">Master's Degree</option>
              <option value="PhD">PhD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">University / Institution</label>
            <input
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="e.g. MIT, Stanford University"
              className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">CGPA (0.0 – 4.0)</label>
            <input
              type="number" step="0.1" min="0" max="4.0"
              value={cgpa}
              onChange={(e) => setCgpa(e.target.value)}
              placeholder="e.g. 3.8"
              className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSaveProfile}
            disabled={profileSaving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60"
          >
            {profileSaving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : profileSaved
                ? <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                : <><CheckCircle2 className="w-4 h-4" /> Save Profile</>
            }
          </motion.button>
        </div>
      </motion.div>

      {/* ── Resume Upload Card ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" /> Resume Upload
        </h3>

        {/* Error / Success banners */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </motion.div>
          )}
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 p-3 rounded-lg bg-success/10 border border-success/30 text-success text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drop zone */}
        <label className={`cursor-pointer w-full block transition-all ${dragActive ? 'scale-[1.02]' : ''}`}>
          <input
            type="file" accept=".pdf"
            onChange={handleFileSelect}
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            className="hidden"
            disabled={isAnalyzing}
          />
          <motion.div
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className={`w-full py-10 border-2 border-dashed rounded-xl flex flex-col items-center gap-4 transition-all ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50'
            } ${isAnalyzing ? 'pointer-events-none opacity-70' : ''}`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <div className="text-center">
                  <p className="text-sm font-medium text-primary">Analyzing with Gemini AI...</p>
                  <p className="text-xs text-muted-foreground mt-1">Scoring, extracting skills & generating insights</p>
                </div>
              </>
            ) : hasResume ? (
              <>
                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-success">Resume uploaded!</p>
                  <p className="text-xs text-muted-foreground mt-1">Click to replace with a new one</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CloudUpload className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Drag & drop your PDF resume here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse (max 5MB)</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <File className="w-3 h-3" /> <span>PDF only</span>
                </div>
              </>
            )}
          </motion.div>
        </label>

        {/* Show AI analysis summary inline after upload */}
        <AnimatePresence>
          {aiAnalysis && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-6 border-t border-border/30"
            >
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> AI Analysis Summary
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'ATS Score',    value: `${aiAnalysis.overall_score}/100`,       color: 'text-primary' },
                  { label: 'Contact',      value: `${aiAnalysis.contact_info_score}%`,      color: 'text-accent'  },
                  { label: 'Experience',   value: `${aiAnalysis.experience_score}%`,        color: 'text-success' },
                  { label: 'Skills Found', value: `${aiAnalysis.skills.length}`,            color: 'text-warning' },
                ].map(m => (
                  <div key={m.label} className="p-3 rounded-lg bg-muted/30 text-center border border-border/20">
                    <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>
              {aiAnalysis.feedback.critical_issue && (
                <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{aiAnalysis.feedback.critical_issue}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Skills Card ────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <h3 className="font-semibold mb-1">Skills</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Automatically extracted from your resume. You can also add skills manually.
        </p>
        <div className="flex flex-wrap gap-2 mb-4 min-h-[2.5rem]">
          {displaySkills.map((skill) => (
            <motion.span
              key={skill} layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20"
            >
              {skill}
              <button
                onClick={() => handleRemoveSkill(skill)}
                className="hover:text-destructive transition-colors ml-0.5"
                aria-label={`Remove ${skill}`}
              >
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
          {displaySkills.length === 0 && (
            <p className="text-sm text-muted-foreground">No skills yet. Upload your resume or add manually.</p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
            placeholder="Add a skill..."
            className="glass-input flex-1 px-4 py-2 text-sm focus:outline-none"
          />
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={handleAddSkill}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
