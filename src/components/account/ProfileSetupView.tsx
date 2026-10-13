import type { ActionState } from "@/lib/actionState";
import { AccountPageLayout } from "./AccountPageLayout";
import { ProfileForm } from "./ProfileForm";
import { blankProfileDefaults } from "./profileDefaults";

/** A.2 Lengkapi profil, shared by /akun/lengkapi and its demo. */
export function ProfileSetupView({
  email,
  googleName,
  googleAvatar = null,
  next,
  action,
}: {
  email: string;
  googleName: string;
  googleAvatar?: string | null;
  next: string;
  action?: (state: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  return (
    <AccountPageLayout
      title="Lengkapi profil kamu"
      intro={
        <>
          <span className="hidden md:inline">Sekali aja sebelum mulai. Biar coach &amp; panitia kenal kamu, dan bisa diubah kapan aja.</span>
          <span className="md:hidden">Sekali aja sebelum mulai, bisa diubah kapan aja.</span>
        </>
      }
    >
      <ProfileForm mode="setup" next={next} email={email} googleName={googleName} googleAvatar={googleAvatar} defaults={blankProfileDefaults(googleName, googleAvatar)} action={action} />
    </AccountPageLayout>
  );
}
