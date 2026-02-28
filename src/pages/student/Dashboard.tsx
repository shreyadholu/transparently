import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import ResumeScoreRing from '@/components/ResumeScoreRing';
import { FileText, Target, Briefcase, Upload, Sparkles, Shield, Type, Search } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } },
};

const FloatingShape = ({ className, delay = 0 }: { className: string; delay?: number }) => (
  <motion.div
    className={`absolute pointer-events-none ${className}`}
    animate={{
      y: [0, -20, 0],
      rotateZ: [0, 10, -10, 0],
      rotateX: [0, 15, -15, 0],
    }}
    transition={{
      duration: 6,
      repeat: Infinity,
      ease: 'easeInOut',
      delay,
    }}
  />
);

const StudentDashboard = () => {
  const { user, applications, jobs, uploadResume } = useApp();
  const navigate = useNavigate();

  const appliedCount = applications.filter(a => a.studentEmail === user?.email).length;
  const approvedCount = applications.filter(a => a.studentEmail === user?.email && a.status === 'approved').length;
  const hasResume = user?.resumeUploaded;

  const handleUpload = () => {
    uploadResume();
  };

  const stats = [
    { icon: Briefcase, label: 'Jobs Available', value: jobs.length, color: 'text-primary', onClick: () => navigate('/student/jobs') },
    { icon: FileText, label: 'Applications', value: appliedCount, color: 'text-accent', onClick: () => navigate('/student/activity') },
    { icon: Target, label: 'Approved', value: approvedCount, color: 'text-success', onClick: undefined },
  ];

  // Structural integrity scores (simulated)
  const contactInfoScore = hasResume ? 92 : 0;
  const experienceHeadersScore = hasResume ? 78 : 0;
  const keywordDensityScore = hasResume ? Math.min(95, (user?.skills?.length || 0) * 15 + 20) : 0;
  const structuralScore = hasResume ? Math.round((contactInfoScore + experienceHeadersScore + keywordDensityScore) / 3) : 0;

  // Empty State
  if (!hasResume) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 relative">
        {/* 3D Floating elements */}
        <FloatingShape className="top-0 right-20 w-16 h-16 rounded-xl bg-primary/5 border border-primary/10 backdrop-blur-sm" delay={0} />
        <FloatingShape className="top-40 right-0 w-10 h-10 rounded-full bg-accent/5 border border-accent/10" delay={1.5} />
        <FloatingShape className="bottom-20 left-10 w-12 h-12 rounded-lg bg-primary/5 border border-primary/10 rotate-45" delay={3} />

        <motion.div variants={item}>
          <h1 className="text-3xl font-bold">Welcome back, <span className="text-gradient-primary">{user?.name}</span></h1>
          <p className="text-muted-foreground mt-1">Let's get your career journey started</p>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((s) => (
            <motion.div
              key={s.label}
              whileHover={{ scale: 1.02, y: -2 }}
              onClick={s.onClick}
              className={`elevated-card p-5 ${s.onClick ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-center gap-3">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <span className="text-sm text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold mt-2">{s.value}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Welcome Upload Card */}
        <motion.div
          variants={item}
          className="elevated-card p-12 flex flex-col items-center text-center relative overflow-hidden"
        >
          {/* Background 3D grid */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
              transform: 'perspective(500px) rotateX(60deg)',
              transformOrigin: 'center top',
            }} />
          </div>

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative z-10"
          >
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center mb-6 mx-auto" style={{ transform: 'perspective(200px) rotateY(-5deg) rotateX(5deg)' }}>
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
          </motion.div>

          <h2 className="text-2xl font-bold mb-2 relative z-10">Welcome to <span className="text-gradient-primary">Transparently</span></h2>
          <p className="text-muted-foreground mb-8 max-w-md relative z-10">
            Upload your resume to unlock personalized job matching, skill analysis, and transparent feedback from recruiters.
          </p>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleUpload}
            className="relative z-10 w-full max-w-sm py-10 border-2 border-dashed border-primary/30 rounded-2xl flex flex-col items-center gap-4 text-muted-foreground hover:border-primary/60 hover:bg-primary/5 transition-all duration-300 group"
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Upload className="w-10 h-10 text-primary group-hover:text-primary" />
            </motion.div>
            <div>
              <p className="text-sm font-semibold text-foreground">Drop Resume to Begin</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX up to 5MB</p>
            </div>
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  // Active State
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 relative">
      {/* 3D Floating elements */}
      <FloatingShape className="top-0 right-20 w-14 h-14 rounded-xl bg-primary/5 border border-primary/10 backdrop-blur-sm" delay={0} />
      <FloatingShape className="top-60 right-4 w-8 h-8 rounded-full bg-accent/8 border border-accent/10" delay={2} />

      <motion.div variants={item}>
        <h1 className="text-3xl font-bold">Welcome back, <span className="text-gradient-primary">{user?.name}</span></h1>
        <p className="text-muted-foreground mt-1">Here's your resume health overview</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <motion.div
            key={s.label}
            whileHover={{ scale: 1.02, y: -2 }}
            onClick={s.onClick}
            className={`elevated-card p-5 ${s.onClick ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold mt-2">{s.value}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resume Score Ring */}
        <motion.div variants={item} className="elevated-card p-8 flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-6">Resume Health</h2>
          <ResumeScoreRing score={user?.resumeScore || 0} />
          <div className="mt-6 grid grid-cols-2 gap-6 text-center w-full">
            <div>
              <p className="text-2xl font-bold text-primary">{user?.skills?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Skills Listed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-success">✓</p>
              <p className="text-sm text-muted-foreground">Resume Uploaded</p>
            </div>
          </div>
        </motion.div>

        {/* Structural Integrity */}
        <motion.div variants={item} className="elevated-card p-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Resume Structural Integrity
          </h2>
          <div className="space-y-5">
            {[
              { label: 'Contact Information', score: contactInfoScore, icon: FileText, desc: 'Email, phone, location detected' },
              { label: 'Experience Headers', score: experienceHeadersScore, icon: Type, desc: 'Section headers & formatting' },
              { label: 'Keyword Density', score: keywordDensityScore, icon: Search, desc: 'Industry-relevant keywords' },
            ].map((metric, i) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.15 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <metric.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{metric.label}</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-primary">{metric.score}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.score}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.5 + i * 0.15 }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{metric.desc}</p>
              </motion.div>
            ))}

            <div className="pt-3 border-t border-border/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Overall Integrity</span>
                <span className="text-lg font-mono font-bold text-gradient-primary">{structuralScore}%</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default StudentDashboard;
