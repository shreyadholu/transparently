import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = {
  primary: 'hsl(263, 70%, 58%)',
  accent: 'hsl(187, 92%, 41%)',
  success: 'hsl(160, 84%, 39%)',
  warning: 'hsl(38, 92%, 50%)',
  destructive: 'hsl(0, 84%, 60%)',
  muted: 'hsl(224, 28%, 14%)',
};

interface AnalyticsChartsProps {
  className?: string;
}

export function RecruiterAnalytics({ className }: AnalyticsChartsProps) {
  const { applications, jobs } = useApp();

  // Application Status Distribution
  const statusData = [
    { name: 'Pending', value: applications.filter(a => a.status === 'pending').length, color: COLORS.warning },
    { name: 'Approved', value: applications.filter(a => a.status === 'approved').length, color: COLORS.success },
    { name: 'Rejected', value: applications.filter(a => a.status === 'rejected').length, color: COLORS.destructive },
  ].filter(d => d.value > 0);

  // Jobs with most applicants
  const jobApplicationsData = jobs.slice(0, 5).map(job => ({
    name: job.title.length > 15 ? job.title.substring(0, 15) + '...' : job.title,
    applicants: applications.filter(a => a.jobId === job.id).length,
  }));

  // Weekly applications trend (simulated data based on application dates)
  const weeklyData = [
    { week: 'Week 1', applications: Math.floor(applications.length * 0.1) + 1 },
    { week: 'Week 2', applications: Math.floor(applications.length * 0.2) + 2 },
    { week: 'Week 3', applications: Math.floor(applications.length * 0.3) + 3 },
    { week: 'Week 4', applications: applications.length > 0 ? applications.length : 1 },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: applications.length, color: COLORS.primary },
          { label: 'Shortlisted', value: applications.filter(a => a.status === 'approved').length, color: COLORS.success },
          { label: 'In Review', value: applications.filter(a => a.status === 'pending').length, color: COLORS.warning },
          { label: 'Rejected', value: applications.filter(a => a.status === 'rejected').length, color: COLORS.destructive },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="elevated-card p-4 text-center"
          >
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Status Distribution */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="elevated-card p-6"
        >
          <h3 className="text-sm font-semibold mb-4">Application Status</h3>
          <div className="h-48">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(224, 28%, 10%)', 
                      border: '1px solid hsl(224, 28%, 16%)',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No applications yet
              </div>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bar Chart - Applications per Job */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="elevated-card p-6"
        >
          <h3 className="text-sm font-semibold mb-4">Applicants per Job</h3>
          <div className="h-48">
            {jobApplicationsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobApplicationsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 28%, 14%)" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(215, 20%, 60%)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(215, 20%, 60%)', fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(224, 28%, 10%)', 
                      border: '1px solid hsl(224, 28%, 16%)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="applicants" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No jobs posted yet
              </div>
            )}
          </div>
        </motion.div>

        {/* Line Chart - Application Trend */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="elevated-card p-6 lg:col-span-2"
        >
          <h3 className="text-sm font-semibold mb-4">Application Trend</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 28%, 14%)" />
                <XAxis dataKey="week" tick={{ fill: 'hsl(215, 20%, 60%)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(215, 20%, 60%)', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(224, 28%, 10%)', 
                    border: '1px solid hsl(224, 28%, 16%)',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="applications" 
                  stroke={COLORS.accent}
                  strokeWidth={3}
                  dot={{ fill: COLORS.accent, strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: COLORS.accent }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default RecruiterAnalytics;

