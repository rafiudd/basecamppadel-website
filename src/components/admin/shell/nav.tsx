import {
  BracketIcon,
  ChartIcon,
  CoachingIcon,
  EditIcon,
  KelasIcon,
  PeopleIcon,
  PinIcon,
  PlayIcon,
  StarIcon,
  TrophyIcon,
  UserIcon,
} from "@/components/ui/icons";
import { canOpenAdminPath, type StaffRole } from "@/lib/accountRules";

export type AdminNavItem = { href: string; label: string; icon: React.ReactNode };
export type AdminNavGroup = { label: string; items: AdminNavItem[] };

/** Desktop side nav, grouped, in this order. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Event",
    items: [
      { href: "/admin/events", label: "Event", icon: <TrophyIcon /> },
      { href: "/admin/liga", label: "Liga", icon: <BracketIcon /> },
      { href: "/admin/live", label: "Live", icon: <PlayIcon /> },
    ],
  },
  {
    label: "User",
    items: [
      { href: "/admin/players", label: "Player", icon: <PeopleIcon /> },
      { href: "/admin/users/coach", label: "Coach", icon: <CoachingIcon /> },
      { href: "/admin/users/scorekeeper", label: "Score Keeper", icon: <ChartIcon /> },
      { href: "/admin/users/admin", label: "Admin", icon: <UserIcon /> },
    ],
  },
  {
    label: "Venue",
    items: [
      { href: "/admin/venues", label: "Venue", icon: <PinIcon /> },
      { href: "/admin/point", label: "Poin", icon: <StarIcon /> },
    ],
  },
  {
    label: "Kelas",
    items: [
      { href: "/admin/coaching", label: "Catatan Coaching", icon: <EditIcon /> },
      { href: "/admin/kelas", label: "Kelas", icon: <KelasIcon /> },
    ],
  },
];

/** Phone bottom tab bar, in this order (user management sits in the account menu there). */
export const MOBILE_NAV: AdminNavItem[] = [
  { href: "/admin/events", label: "Event", icon: <TrophyIcon /> },
  { href: "/admin/liga", label: "Liga", icon: <TrophyIcon /> },
  { href: "/admin/kelas", label: "Kelas", icon: <KelasIcon /> },
  { href: "/admin/live", label: "Live", icon: <PlayIcon /> },
  { href: "/admin/players", label: "Pemain", icon: <PeopleIcon /> },
  { href: "/admin/coaching", label: "Coaching", icon: <CoachingIcon /> },
  { href: "/admin/point", label: "Poin", icon: <StarIcon /> },
  { href: "/admin/venues", label: "Venue", icon: <PinIcon /> },
];

/** The menu items a role may open: coach only Coaching, score keeper only Live, admin everything. */
export const navFor = (role: StaffRole, items: AdminNavItem[]) => items.filter((l) => canOpenAdminPath(role, l.href));

export const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
