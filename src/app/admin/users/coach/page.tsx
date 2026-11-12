import type { Document, Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { CoachUsersClient } from "@/components/admin/users/CoachUsersClient";
import type { CoachUserItem } from "@/components/admin/users/CoachUserForm";

export const metadata = { title: "Coach — Basecamp Padel" };

export default async function CoachManagementPage() {
  await requireAdmin();

  const db = await getDb();
  const coachDocs = await db
    .collection("coaches")
    .find({})
    .sort({ name: 1 })
    .toArray();

  const venueDocs = await db
    .collection("venues")
    .find({ active: true })
    .sort({ name: 1 })
    .toArray();
  const venues = venueDocs.map((v) => ({ id: String(v.id || v._id), name: v.name as string }));

  const coachIds = coachDocs.map((c) => String(c.id || c._id));
  const adminCoachDocs = await db
    .collection("admin_users")
    .find({
      $or: [{ coach_id: { $in: coachIds } }, { role: "coach" }],
    } as any)
    .toArray();

  const coachToUserId = new Map<string, string>();
  const userIds: string[] = [];

  for (const ac of adminCoachDocs) {
    if (ac.coach_id) {
      coachToUserId.set(String(ac.coach_id), String(ac.user_id || ac._id));
      userIds.push(String(ac.user_id || ac._id));
    }
  }

  // Also include user_id directly on coachDoc if any
  for (const c of coachDocs) {
    if (c.user_id) {
      userIds.push(String(c.user_id));
      if (!coachToUserId.has(String(c.id || c._id))) {
        coachToUserId.set(String(c.id || c._id), String(c.user_id));
      }
    }
  }

  // Only the fields the coach list / resume shows are read — assessments in particular carry scores
  // and evaluation text that this page never uses.
  const [authUsers, coachingGroups, coachingAssessments, classSchedules] = await Promise.all([
    userIds.length
      ? db
          .collection("auth_users")
          .find(
            { $or: [{ id: { $in: userIds } }, { _id: { $in: userIds } }] } as any,
            { projection: { id: 1, email: 1 } },
          )
          .toArray()
      : Promise.resolve([]),
    db.collection("coaching_groups").find({ coach_id: { $in: coachIds } }, { projection: { coach_id: 1, session_id: 1 } }).toArray(),
    db.collection("coaching_assessments").find({ coach_id: { $in: coachIds } }, { projection: { coach_id: 1, session_id: 1 } }).toArray(),
    db.collection("class_schedules").find({ coach_id: { $in: coachIds } }, { projection: { coach_id: 1, class_id: 1 } }).toArray(),
  ]);

  // Only classes a coach is tied to (default coach, or has a schedule in) — not every class.
  const scheduledClassIds = [...new Set(classSchedules.map((s) => String(s.class_id)).filter(Boolean))];
  const allClasses = await db
    .collection("classes")
    .find<Document>(
      {
        $or: [
          { default_coach_id: { $in: coachIds } },
          { id: { $in: scheduledClassIds } },
          { _id: { $in: scheduledClassIds } },
        ],
      } as Filter<Document>,
      { projection: { id: 1, title: 1, category: 1, default_coach_id: 1 } },
    )
    .toArray();

  const allSessionIds = [
    ...new Set([
      ...coachingGroups.map((g) => String(g.session_id)),
      ...coachingAssessments.map((a) => String(a.session_id)),
    ].filter(Boolean)),
  ];

  const coachingSessions = allSessionIds.length > 0
    ? await db
        .collection("coaching_sessions")
        .find(
          { $or: [{ id: { $in: allSessionIds } }, { _id: { $in: allSessionIds } }] as any },
          { projection: { id: 1, title: 1, session_date: 1, venue_name: 1, status: 1 } },
        )
        .toArray()
    : [];

  const sessionMap = new Map<string, any>();
  for (const s of coachingSessions) {
    sessionMap.set(String(s.id || s._id), s);
  }

  const classMap = new Map<string, any>();
  for (const cl of allClasses) {
    classMap.set(String(cl.id || cl._id), cl);
  }

  const authUserEmailMap = new Map<string, string>();
  for (const u of authUsers) {
    if (u.id) authUserEmailMap.set(String(u.id), u.email);
    if (u._id) authUserEmailMap.set(String(u._id), u.email);
  }

  const coaches: CoachUserItem[] = coachDocs.map((doc) => {
    const cId = String(doc.id || doc._id);
    const uId = coachToUserId.get(cId) || null;
    const email = uId ? authUserEmailMap.get(uId) ?? null : null;

    const groups = coachingGroups.filter((g) => String(g.coach_id) === cId);
    const assessments = coachingAssessments.filter((a) => String(a.coach_id) === cId);
    const sessionIds = [
      ...new Set([
        ...groups.map((g) => String(g.session_id)),
        ...assessments.map((a) => String(a.session_id)),
      ].filter(Boolean)),
    ];
    const coachSessionsList = sessionIds
      .map((sId) => sessionMap.get(sId))
      .filter(Boolean)
      .map((s) => ({
        id: String(s.id || s._id),
        title: s.title || "Sesi Coaching",
        session_date: s.session_date ? String(s.session_date).slice(0, 10) : "",
        venue_name: s.venue_name || undefined,
        status: s.status || "finished",
      }))
      .sort((a, b) => b.session_date.localeCompare(a.session_date));

    const schedules = classSchedules.filter((s) => String(s.coach_id) === cId);
    const defaultClasses = allClasses.filter((cl) => String(cl.default_coach_id) === cId);
    const scheduleClassIds = new Set(schedules.map((s) => String(s.class_id)).filter(Boolean));
    const allAssignedClassIds = new Set([
      ...defaultClasses.map((cl) => String(cl.id || cl._id)),
      ...scheduleClassIds,
    ]);

    const coachClassesList = [...allAssignedClassIds]
      .map((clId) => {
        const cl = classMap.get(clId);
        const coachScheduleCount = schedules.filter((s) => String(s.class_id) === clId).length;
        return {
          id: clId,
          title: cl?.title || "Kelas",
          category: cl?.category || null,
          schedulesCount: coachScheduleCount,
          isDefaultCoach: String(cl?.default_coach_id) === cId,
        };
      })
      .sort((a, b) => b.schedulesCount - a.schedulesCount);

    return {
      id: cId,
      name: doc.name || "Coach",
      active: doc.active ?? true,
      user_id: uId,
      email,
      created_at: doc.created_at || new Date().toISOString(),
      slug: doc.slug || "",
      venue_id: doc.venue_id || null,
      position: doc.position || null,
      instagram: doc.instagram || "",
      bio: doc.bio || "",
      photo_url: doc.photo_url ?? null,
      resume: {
        coachingSessionsCount: coachSessionsList.length,
        coachingGroupsCount: groups.length,
        assessmentsCount: assessments.length,
        classesCount: coachClassesList.length,
        classSchedulesCount: schedules.length,
        coachingSessions: coachSessionsList,
        classes: coachClassesList,
      },
    };
  });

  return <CoachUsersClient coaches={coaches} venues={venues} />;
}
