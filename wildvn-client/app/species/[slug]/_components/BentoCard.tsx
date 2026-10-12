// SERVER COMPONENT

interface BentoCardProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function BentoCard({ label, children, className = "" }: BentoCardProps) {
  return (
    <div className={`bento-card ${className}`}>
      <div className="bento-label">{label}</div>
      <div className="bento-content">
        {children}
      </div>
    </div>
  );
}
