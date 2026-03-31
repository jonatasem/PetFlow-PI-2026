interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  tone?: "sand" | "mint" | "peach" | "night";
  onClick?: () => void;
  active?: boolean;
}

export function MetricCard({ label, value, detail, tone = "sand", onClick, active = false }: MetricCardProps) {
  const className = `metric-card metric-card--${tone}${onClick ? " metric-card--button" : ""}${active ? " metric-card--active" : ""}`;

  if (onClick) {
    return (
      <button className={className} onClick={onClick} type="button">
        <p className="metric-card__label">{label}</p>
        <h3 className="metric-card__value">{value}</h3>
        <p className="metric-card__detail">{detail}</p>
      </button>
    );
  }

  return (
    <div className={className}>
      <p className="metric-card__label">{label}</p>
      <h3 className="metric-card__value">{value}</h3>
      <p className="metric-card__detail">{detail}</p>
    </div>
  );
}
