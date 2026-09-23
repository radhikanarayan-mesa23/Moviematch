"use client";

interface ChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  caveat?: string;
}

export function Chip({ label, selected, onClick, caveat }: ChipProps) {
  return (
    <button type="button" className="chip" data-selected={selected} onClick={onClick}>
      <span>{label}</span>
      {caveat && <span className="text-[11px] opacity-70">({caveat})</span>}
    </button>
  );
}
