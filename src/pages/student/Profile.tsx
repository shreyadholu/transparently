import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { Upload, Plus, X, UserCircle, FileText, CheckCircle2 } from 'lucide-react';

const Profile = () => {
  const { user, updateSkills, uploadResume } = useApp();
  const [newSkill, setNewSkill] = useState('');
  const [uploaded, setUploaded] = useState(false);

  const handleAddSkill = () => {
    if (!newSkill.trim() || !user) return;
    updateSkills([...user.skills, newSkill.trim()]);
    setNewSkill('');
  };

  const handleRemoveSkill = (skill: string) => {
    if (!user) return;
    updateSkills(user.skills.filter(s => s !== skill));
  };

  const handleUpload = () => {
    uploadResume();
    setUploaded(true);
    setTimeout(() => setUploaded(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your resume and skills</p>
      </div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.name}</h2>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </motion.div>

      {/* Resume Upload */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Resume
        </h3>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleUpload}
          className="w-full py-8 border-2 border-dashed border-border/50 rounded-xl flex flex-col items-center gap-3 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          {uploaded || user?.resumeUploaded ? (
            <>
              <CheckCircle2 className="w-8 h-8 text-success" />
              <span className="text-success text-sm font-medium">Resume uploaded!</span>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8" />
              <span className="text-sm">Click to upload PDF resume (simulated)</span>
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Skills */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h3 className="font-semibold mb-4">Skills</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {user?.skills.map((skill) => (
            <motion.span
              key={skill}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20"
            >
              {skill}
              <button onClick={() => handleRemoveSkill(skill)} className="hover:text-destructive transition-colors">
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
            placeholder="Add a skill..."
            className="glass-input flex-1 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
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
