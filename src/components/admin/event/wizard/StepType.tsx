import type { EventWizard } from "./useEventWizard";
import { RadioCard, StepSection } from "./parts";

export function StepType({ w }: { w: EventWizard }) {
  return (
    <StepSection title="Tipe event">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <RadioCard big invalid={w.invalid("type")} on={w.type === "mabar"} onClick={() => w.setType("mabar")} title="Mabar" desc="Main bareng santai. Pairing diacak per ronde, klasemen individu atau per pasangan." />
        <RadioCard big invalid={w.invalid("type")} on={w.type === "kompetisi"} onClick={() => w.setType("kompetisi")} title="Kompetisi" desc="Tim tetap. Fase grup round robin, lalu knockout sampai final." />
      </div>
    </StepSection>
  );
}
