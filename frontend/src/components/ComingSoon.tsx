import { cn } from "@/lib/utils";

interface ComingSoonProps {
  label?: string;
  className?: string;
  description?: string;
}

export function ComingSoon({
  label = "Coming Soon",
  className,
  description,
}: ComingSoonProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 rounded-xl border border-gray-200 dark:border-[#2e2e38] bg-gray-50 dark:bg-[#1e1e24]",
        className
      )}
      aria-label={label}
      role="status"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-600/20 text-violet-300 border border-violet-600/30">
          {label}
        </span>
      </div>
      {description && (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center max-w-xs">{description}</p>
      )}
    </div>
  );
}
