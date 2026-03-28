import type { ConceptStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConceptBadgeProps {
  status: ConceptStatus;
  className?: string;
}

export function ConceptBadge({ status, className }: ConceptBadgeProps) {
  const statusConfig = {
    mastered: {
      label: 'Mastered',
      className: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20 hover:bg-[#22C55E]/20',
    },
    weak: {
      label: 'Weak',
      className: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 hover:bg-[#F59E0B]/20',
    },
    missing: {
      label: 'Missing',
      className: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20 hover:bg-[#EF4444]/20',
    },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
