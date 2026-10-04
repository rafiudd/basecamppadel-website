import { PeopleIcon, PinIcon, PlayIcon, StarIcon, TrophyIcon } from "@/components/ui/icons";

/** Admin menu. Desktop shows it in this order; the phone bottom nav uses `mobileOrder`. */
export const ADMIN_NAV = [
  { href: "/admin/events", label: "Event", icon: <TrophyIcon />, mobileOrder: 0 },
  { href: "/admin/live", label: "Live", icon: <PlayIcon />, mobileOrder: 1 },
  { href: "/admin/point", label: "Poin", icon: <StarIcon />, mobileOrder: 3 },
  { href: "/admin/players", label: "Pemain", icon: <PeopleIcon />, mobileOrder: 2 },
  { href: "/admin/venues", label: "Venue", icon: <PinIcon />, mobileOrder: 4 },
];

export const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
