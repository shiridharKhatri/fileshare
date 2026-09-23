interface FalconIconProps {
  className?: string;
}

export default function FalconIcon({ className = "w-10 h-6 text-[#2c3746]" }: FalconIconProps) {
  return (
    <svg
      viewBox="0 0 100 50"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/* Soaring falcon silhouette */}
      <path d="M50 26 C44 20 30 11 12 7 C2 5 0 5 0 5 C0 5 6 12 18 17 C29 22 40 25 48 27 C49 31 51 40 48 45 C51 40 54 35 55 31 C57 28 62 26 66 25 C75 22 88 16 98 6 C100 4 100 4 100 4 C100 4 94 6 83 9 C66 13 54 20 50 26 Z" />
    </svg>
  );
}
