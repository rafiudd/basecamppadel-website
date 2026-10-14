import type { ActionState } from "@/lib/actionState";
import { AccountPageLayout } from "./AccountPageLayout";
import { AccountSettings } from "./AccountSettings";
import { ProfileForm } from "./ProfileForm";
import { profileDefaults, type EditableProfile } from "./profileDefaults";

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;

/** A.4 Edit profil + the "Akun" card with Hapus akun (A.5), shared by /akun/edit and its demo. */
export function ProfileEditView({
  profile,
  email,
  googleAvatar = null,
  backHref,
  categoryLocked,
  saveAction,
  deleteAction,
}: {
  profile: EditableProfile;
  email: string;
  googleAvatar?: string | null;
  backHref: string;
  categoryLocked: boolean;
  saveAction?: Action;
  deleteAction?: Action;
}) {
  return (
    <AccountPageLayout title="Edit profil" back={{ href: backHref, label: "Akun" }}>
      <ProfileForm
        mode="edit"
        next={backHref}
        email={email}
        googleName={profile.full_name}
        googleAvatar={googleAvatar}
        categoryLocked={categoryLocked}
        defaults={profileDefaults(profile, googleAvatar)}
        action={saveAction}
      />
      <AccountSettings name={profile.full_name || profile.nickname} email={email} photoUrl={googleAvatar} action={deleteAction} />
    </AccountPageLayout>
  );
}
