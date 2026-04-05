import { CheckCircle2, XCircle, Clock, Send, FileSearch, Users, Award } from 'lucide-react';
import type { ApplicationStatus } from '@/contexts/AppContext';

interface StatusBadgeProps {
  status: ApplicationStatus | string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  applied:     { label: 'Applied',     icon: Send,         className: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  screened:    { label: 'Screened',    icon: FileSearch,   className: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  shortlisted: { label: 'Shortlisted', icon: Users,        className: 'bg-purple-500/15 text-purple-400 border-purple-500/25' },
  interview:   { label: 'Interview',   icon: Users,        className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25' },
  selected:    { label: 'Selected',    icon: CheckCircle2, className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  approved:    { label: 'Approved',    icon: CheckCircle2, className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  rejected:    { label: 'Rejected',    icon: XCircle,      className: 'bg-red-500/15 text-red-400 border-red-500/25' },
  under_review:{ label: 'Under Review',icon: Clock,        className: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  pending:     { label: 'Pending',     icon: Clock,        className: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
};

// Light mode overrides
const STATUS_CONFIG_LIGHT: Record<string, string> = {
  applied:     'bg-blue-50 text-blue-700 border-blue-200',
  screened:    'bg-amber-50 text-amber-700 border-amber-200',
  shortlisted: 'bg-purple-50 text-purple-700 border-purple-200',
  interview:   'bg-cyan-50 text-cyan-700 border-cyan-200',
  selected:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  approved:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected:    'bg-red-50 text-red-700 border-red-200',
  under_review:'bg-amber-50 text-amber-700 border-amber-200',
  pending:     'bg-amber-50 text-amber-700 border-amber-200',
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const lightClass = STATUS_CONFIG_LIGHT[status] || STATUS_CONFIG_LIGHT.pending;
  const Icon = config.icon;

  const sizeClasses = size === 'sm'
    ? 'text-[11px] px-2.5 py-1 gap-1'
    : 'text-xs px-3 py-1.5 gap-1.5';

  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full font-bold uppercase tracking-wider border ${config.className} light:hidden`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {config.label}
    </span>
  );
}

// Simplified version for use in tables
export function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    applied: 'bg-blue-400',
    screened: 'bg-amber-400',
    shortlisted: 'bg-purple-400',
    interview: 'bg-cyan-400',
    selected: 'bg-emerald-400',
    approved: 'bg-emerald-400',
    rejected: 'bg-red-400',
    under_review: 'bg-amber-400',
    pending: 'bg-amber-400',
  };
  return <span className={`w-2 h-2 rounded-full ${colorMap[status] || 'bg-gray-400'}`} />;
}

export default StatusBadge;
