import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { Plus, X, Briefcase, CheckCircle2, Trash2, Loader2 } from 'lucide-react';

const JobManagement = () => {
  const { jobs, addJob, deleteJob, user } = useApp();
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [criteria, setCriteria] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAddSkill = () => {
    if (!skillInput.trim()) return;
    setSkills(prev => [...prev, skillInput.trim()]);
    setSkillInput('');
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(prev => prev.filter(s => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !company || skills.length === 0 || !user?.id) return;

    setSubmitting(true);

    try {
      // Insert job into Supabase with required_skills
      const { data, error } = await supabase.from("jobs").insert([
        {
          title: title,
          company: company,
          description: criteria,
          required_skills: skills,
          created_by: user.id
        }
      ]).select();

      if (error) {
        console.error("Error creating job:", error);
        setSubmitting(false);
        return;
      }

      // Also update local state
      addJob({ title, company, skills, criteria });
      setTitle('');
      setCompany('');
      setCriteria('');
      setSkills([]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error creating job:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from("jobs")
        .delete()
        .eq("id", jobId);

      if (error) {
        console.error("Error deleting job:", error);
      }

      // Update local state
      deleteJob(jobId);
    } catch (err) {
      console.error("Error deleting job:", err);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Job Management</h1>
        <p className="text-muted-foreground mt-1">Create and manage job postings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold mb-5">Create New Posting</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Job Title</label>
              <input 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="e.g. Frontend Developer" 
                className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" 
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Company</label>
              <input 
                value={company} 
                onChange={e => setCompany(e.target.value)} 
                placeholder="e.g. TechCorp" 
                className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" 
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Criteria</label>
              <textarea 
                value={criteria} 
                onChange={e => setCriteria(e.target.value)} 
                placeholder="Job requirements..." 
                rows={3} 
                className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none" 
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Required Skills</label>
              <div className="flex gap-2 mb-2">
                <input 
                  value={skillInput} 
                  onChange={e => setSkillInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())} 
                  placeholder="Add skill..." 
                  className="glass-input flex-1 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" 
                />
                <button 
                  type="button" 
                  onClick={handleAddSkill} 
                  className="px-3 py-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                    {s}
                    <button type="button" onClick={() => handleRemoveSkill(s)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={submitting || !title || !company || skills.length === 0}
              className="w-full py-2.5 bg-accent text-accent-foreground rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : success ? (
                <><CheckCircle2 className="w-4 h-4" /> Job Posted!</>
              ) : (
                <><Plus className="w-4 h-4" /> Create Posting</>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Existing jobs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold">Active Postings ({jobs.length})</h2>
          {jobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card-subtle p-4"
            >
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{job.title}</p>
                  <p className="text-xs text-muted-foreground">{job.company} · {job.skills.length} skills required</p>
                </div>
                <button
                  onClick={() => handleDeleteJob(job.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default JobManagement;

