import { motion } from 'framer-motion';
import { Check, Clock, FileText, Users, Award, XCircle } from 'lucide-react';

export type ApplicationStatus = 'applied' | 'screened' | 'shortlisted' | 'interview' | 'selected' | 'rejected';

interface ApplicationTimelineProps {
  currentStatus: 'pending' | 'approved' | 'rejected' | 'selected' | 'under_review';
  appliedAt?: string;
}

const stages: { key: ApplicationStatus; label: string; icon: React.ElementType }[] = [
  { key: 'applied', label: 'Applied', icon: FileText },
  { key: 'screened', label: 'Resume Screened', icon: FileText },
  { key: 'shortlisted', label: 'Shortlisted', icon: Users },
  { key: 'interview', label: 'Interview', icon: Users },
  { key: 'selected', label: 'Selected', icon: Award },
];

const getStageIndex = (status: string): number => {
  if (status === 'rejected') return -1;
  if (status === 'approved' || status === 'selected') return 4; // All stages completed
  if (status === 'under_review') return 2; // After shortlisted
  return 1; // Pending = after screened
};

export function ApplicationTimeline({ currentStatus, appliedAt }: ApplicationTimelineProps) {
  const currentIndex = getStageIndex(currentStatus);
  const isRejected = currentStatus === 'rejected';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Progress Line Background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted" />
        
        {/* Progress Line Fill */}
        {!isRejected && (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(currentIndex / (stages.length - 1)) * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-primary to-accent"
            style={{ right: `${100 - (currentIndex / (stages.length - 1)) * 100}%` }}
          />
        )}

        {stages.map((stage, index) => {
          const isCompleted = !isRejected && index <= currentIndex;
          const isCurrent = !isRejected && index === currentIndex;
          const isRejectedStage = isRejected && index === Math.floor(stages.length / 2);

          return (
            <div key={stage.key} className="flex flex-col items-center relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRejectedStage
                    ? 'bg-destructive/20 border-2 border-destructive'
                    : isCompleted
                    ? 'bg-gradient-to-br from-primary to-accent border-2 border-primary shadow-lg shadow-primary/30'
                    : 'bg-muted border-2 border-muted-foreground/20'
                }`}
              >
                {isRejectedStage ? (
                  <XCircle className="w-5 h-5 text-destructive" />
                ) : isCompleted ? (
                  isCurrent ? (
                    <Clock className="w-5 h-5 text-primary-foreground" />
                  ) : (
                    <Check className="w-5 h-5 text-primary-foreground" />
                  )
                ) : (
                  <stage.icon className="w-4 h-4 text-muted-foreground" />
                )}
              </motion.div>
              <motion.span
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                className={`mt-2 text-xs font-medium ${
                  isRejectedStage
                    ? 'text-destructive'
                    : isCompleted
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {stage.label}
              </motion.span>
            </div>
          );
        })}
      </div>

      {appliedAt && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          Applied on {new Date(appliedAt).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </p>
      )}
    </div>
  );
}

export default ApplicationTimeline;

