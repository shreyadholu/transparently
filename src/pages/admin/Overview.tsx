import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, BarChart3, Building2, Sparkles, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 100 } },
};

const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 800;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setDisplay(Math.round(p * value));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <>{display}</>;
};

const AdminOverview = () => {
  const { applications, jobs } = useApp();
  const navigate = useNavigate();

  const stats = [
    { icon: Users, label: 'Total Applicants', value: applications.length, gradient: 'from-primary to-primary/60', onClick: () => navigate('/admin/applicants') },
    { icon: Briefcase, label: 'Active Postings', value: jobs.length, gradient: 'from-accent to-accent/60', onClick: () => navigate('/admin/active-postings') },
    { icon: BarChart3, label: 'Pending Review', value: applications.filter(a => a.status === 'pending').length, gradient: 'from-warning to-warning/60', onClick: () => navigate('/admin/applicants') },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Company Header */}
      <motion.div variants={item} className="elevated-card p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          <Building2 className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Transparently <Sparkles className="w-5 h-5 text-primary" />
          </h1>
          <p className="text-muted-foreground text-sm">Company Recruitment Dashboard</p>
        </div>
      </motion.div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {stats.map((s) => (
          <motion.div
            key={s.label}
            variants={item}
            whileHover={{ scale: 1.02, y: -4 }}
            onClick={s.onClick}
            className="elevated-card p-6 cursor-pointer group"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-4 opacity-80 group-hover:opacity-100 transition-opacity`}>
              <s.icon className="w-5 h-5 text-foreground" />
            </div>
            <p className="text-3xl font-bold mb-1 animate-count-up"><AnimatedNumber value={s.value} /></p>
            <p className="section-header">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Active Postings */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="section-header text-sm flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-accent" /> Active Postings
          </h2>
          {jobs.length > 6 && (
            <button onClick={() => navigate('/admin/jobs')} className="btn-view-more">
              View More <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobs.slice(0, 6).map((job, i) => {
            const jobApps = applications.filter(a => a.jobId === job.id);
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => navigate('/admin/active-postings')}
                className="elevated-card p-5 cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.company}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {job.skills.slice(0, 3).map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent" style={{ border: '1px solid hsl(187 92% 41% / 0.15)' }}>{s}</span>
                  ))}
                  {job.skills.length > 3 && <span className="text-[10px] text-muted-foreground">+{job.skills.length - 3}</span>}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span>{jobApps.length} applicant{jobApps.length !== 1 ? 's' : ''}</span>
                  <span className="text-primary font-medium">{jobApps.filter(a => a.status === 'pending').length} pending</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Applications */}
      <motion.div variants={item} className="elevated-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="section-header text-sm">Recent Applications</h2>
          {applications.length > 3 && (
            <button onClick={() => navigate('/admin/applicants')} className="btn-view-more">
              View More <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {applications.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">No applications yet</p>
        ) : (
          <div className="space-y-3">
            {applications.slice(-3).reverse().map((app) => {
              const job = jobs.find(j => j.id === app.jobId);
              return (
                <div key={app.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <p className="text-sm font-medium">{app.studentName}</p>
                    <p className="text-xs text-muted-foreground">{job?.title} at {job?.company}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-primary">{app.resumeScore}%</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      app.status === 'approved' ? 'bg-success/10 text-success' :
                      app.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                      'bg-warning/10 text-warning'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default AdminOverview;
