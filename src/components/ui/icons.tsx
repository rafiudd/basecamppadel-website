/** Stroke icons used across the admin (24×24 viewBox, currentColor). */

type IconProps = { size?: number; strokeWidth?: number; className?: string };

function Icon({ size = 20, strokeWidth = 1.8, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`flex-none ${className ?? ""}`}
    >
      {children}
    </svg>
  );
}

const make = (paths: React.ReactNode, defaults: IconProps = {}) =>
  function NamedIcon(props: IconProps) {
    return <Icon {...defaults} {...props}>{paths}</Icon>;
  };

export const TrashIcon = make(
  <>
    <polyline points="4 7 20 7" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </>,
  { size: 18 },
);
export const CloseIcon = make(
  <>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </>,
  { size: 18 },
);
export const CheckIcon = make(<polyline points="5 12 10 17 19 7" />, { size: 16 });
export const CopyIcon = make(
  <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a1 1 0 0 1 1-1h10" />
  </>,
  { size: 16 },
);
export const EditIcon = make(
  <>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <line x1="13" y1="7" x2="17" y2="11" />
  </>,
);
export const LinkIcon = make(
  <>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </>,
);
export const PlayIcon = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
  </>,
  { size: 22 },
);
export const TrophyIcon = make(
  <>
    <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
    <path d="M16 5h3v2a3 3 0 0 1-3 3" />
    <path d="M8 5H5v2a3 3 0 0 0 3 3" />
    <line x1="12" y1="13" x2="12" y2="17" />
    <path d="M8 20h8l-1-3H9z" />
  </>,
  { size: 22 },
);
export const PeopleIcon = make(
  <>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17.5" cy="9" r="2.3" />
    <path d="M16 14.2c2.6.4 4.5 2.6 4.5 5.3" />
  </>,
  { size: 22 },
);
export const StarIcon = make(<polygon points="12 3 14.8 9 21 9.6 16.3 13.8 17.7 20 12 16.8 6.3 20 7.7 13.8 3 9.6 9.2 9" />, { size: 22 });
export const PinIcon = make(
  <>
    <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </>,
  { size: 22 },
);
export const UserIcon = make(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </>,
);
export const SearchIcon = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.5" y2="16.5" />
  </>,
  { size: 18 },
);
export const ShuffleIcon = make(
  <>
    <polyline points="16 3 21 3 21 8" />
    <line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21 16 21 21 16 21" />
    <line x1="14" y1="14" x2="21" y2="21" />
    <line x1="4" y1="4" x2="9" y2="9" />
  </>,
  { size: 18, strokeWidth: 2 },
);
export const PhoneIcon = make(
  <>
    <rect x="7" y="2" width="10" height="20" rx="2" />
    <line x1="11" y1="18" x2="13" y2="18" />
  </>,
  { size: 18 },
);
export const FormatIcon = make(
  <>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <line x1="4" y1="10" x2="20" y2="10" />
    <line x1="10" y1="10" x2="10" y2="20" />
  </>,
  { size: 18 },
);
export const ListIcon = make(
  <>
    <line x1="8" y1="6" x2="20" y2="6" />
    <line x1="8" y1="12" x2="20" y2="12" />
    <line x1="8" y1="18" x2="20" y2="18" />
    <circle cx="4" cy="6" r="1" fill="currentColor" />
    <circle cx="4" cy="12" r="1" fill="currentColor" />
    <circle cx="4" cy="18" r="1" fill="currentColor" />
  </>,
  { size: 18 },
);
export const ChartIcon = make(
  <>
    <line x1="6" y1="20" x2="6" y2="13" />
    <line x1="12" y1="20" x2="12" y2="6" />
    <line x1="18" y1="20" x2="18" y2="10" />
  </>,
  { size: 18 },
);
export const BracketIcon = make(
  <>
    <path d="M3 5h5v6H3" />
    <path d="M3 13h5v6H3" />
    <path d="M8 8h4v8H8" />
    <line x1="12" y1="12" x2="21" y2="12" />
  </>,
  { size: 18 },
);
