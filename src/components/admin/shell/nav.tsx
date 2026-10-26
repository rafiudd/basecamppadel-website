import { CoachingIcon, KelasIcon, PeopleIcon, PinIcon, PlayIcon, StarIcon, TrophyIcon, UserIcon } from "@/components/ui/icons";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  mobileOrder: number;
  adminOnly?: boolean;
};

/** Admin menu. Desktop shows it in this order; the phone bottom nav uses `mobileOrder`. */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin/events", label: "Event", icon: <TrophyIcon />, mobileOrder: 0 },
  { href: "/admin/liga", label: "Liga", icon: <TrophyIcon />, mobileOrder: 1 },
  { href: "/admin/kelas", label: "Kelas", icon: <KelasIcon />, mobileOrder: 2 },
  { href: "/admin/live", label: "Live", icon: <PlayIcon />, mobileOrder: 3 },
  { href: "/admin/point", label: "Poin", icon: <StarIcon />, mobileOrder: 6 },
  { href: "/admin/players", label: "Pemain", icon: <PeopleIcon />, mobileOrder: 4 },
  { href: "/admin/coaching", label: "Coaching", icon: <CoachingIcon />, mobileOrder: 5 },
  { href: "/admin/venues", label: "Venue", icon: <PinIcon />, mobileOrder: 7 },
  { href: "/admin/users/admin", label: "Admin", icon: <UserIcon />, mobileOrder: 8, adminOnly: true },
  { href: "/admin/users/scorekeeper", label: "Score Keeper", icon: <PlayIcon />, mobileOrder: 9, adminOnly: true },
  { href: "/admin/users/coach", label: "Coach", icon: <CoachingIcon />, mobileOrder: 10, adminOnly: true },
];


export const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
