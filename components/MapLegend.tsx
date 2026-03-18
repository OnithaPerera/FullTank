const legendItems = [
  { color: 'bg-red-500', label: 'Red', meaning: 'Empty / no fuel' },
  { color: 'bg-amber-400', label: 'Yellow', meaning: 'Pending verification' },
  { color: 'bg-emerald-500', label: 'Green', meaning: 'Verified / available' },
  { color: 'bg-slate-400', label: 'Gray', meaning: 'Stale / outdated' },
];

export default function MapLegend() {
  return (
    <div className="ui-panel w-[min(15rem,calc(100vw-1rem))] rounded-[20px] px-3 py-2.5 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="ui-kicker">Map Guide</p>
          <p className="ui-text-muted mt-0.5 text-[11px] leading-4">Marker colors at a glance.</p>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        {legendItems.map((item) => (
          <div
            key={item.label}
            className="ui-panel-muted rounded-[16px] px-2.5 py-2"
          >
            <div className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.color}`}></span>
              <span className="text-[11px] font-semibold">{item.label}</span>
            </div>
            <p className="ui-text-muted mt-0.5 text-[10px] leading-4">{item.meaning}</p>
          </div>
        ))}
      </div>

      <p className="ui-text-muted mt-2.5 text-[10px] leading-4">
        Green markers appear after 3 separate community confirmations.
      </p>
    </div>
  );
}
