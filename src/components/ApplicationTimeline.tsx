import { motion } from 'framer-motion';
import { Check, Clock, FileText, Users, Award, XCircle, Send, FileSearch } from 'lucide-react';

interface ApplicationTimelineProps {
  currentStatus: string;
  appliedAt?: string;
  compact?: boolean;
}

const stages = [
  { key: 'applied',     label: 'Applied',         icon: Send },
  { key: 'screened',    label: 'Resume Screened',  icon: FileSearch },
  { key: 'shortlisted', label: 'Shortlisted',     icon: Users },
  { key: 'interview',   label: 'Interview',       icon: Users },
  { key: 'selected',    label: 'Selected',        icon: Award },
];

function getStageIndex(status: string): number {
  const map: Record<string, number> = {
    applied: 0,
    screened: 1,
    under_review: 1,
    pending: 0,
    shortlisted: 2,
    interview: 3,
    selected: 4,
    approved: 4,
    rejected: -1,
  };
  return map[status] ?? 0;
}

export function ApplicationTimeline({ currentStatus, appliedAt, compact = false }: ApplicationTimelineProps) {
  const currentIndex = getStageIndex(currentStatus);
  const isRejected = currentStatus === 'rejected';

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {stages.map((stage, index) => {
          const isCompleted = !isRejected && index <= currentIndex;
          const isRejectedHere = isRejected && index === Math.max(currentIndex, 1);
          return (
            <div key={stage.key} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full transition-all ${
                isRejectedHere ? 'bg-destructive' :
                isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'
              }`} />
              {index < stages.length - 1 && (
                <div className={`w-4 h-0.5 rounded-full ${
                  !isRejected && index < currentIndex ? 'bg-primary' : 'bg-muted-foreground/20'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Progress Line Background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted" />

        {/* Progress Line Fill */}
        {!isRejected && currentIndex >= 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(currentIndex / (stages.length - 1)) * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-primary to-accent"
          />
        )}

        {stages.map((stage, index) => {
          const isCompleted = !isRejected && index <= currentIndex;
          const isCurrent = !isRejected && index === currentIndex;
          const isRejectedStage = isRejected && index === Math.max(currentIndex, 1);

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
                className={`mt-2 text-xs font-medium text-center max-w-[70px] leading-tight ${
                  isRejectedStage
                    ? 'text-destructive'
                    : isCompleted
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {isRejectedStage ? 'Rejected' : stage.label}
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
