import { ActionForm } from "@/components/admin/ActionForm";
import { InlineDelete } from "@/components/admin/InlineDelete";
import { formatRupiah } from "@/lib/format";
import { courtRentalCost, dayOfWeekFromDateStr } from "@/lib/venuePricing";
import { addEventTransaction, deleteEventTransaction } from "@/app/admin/events/finance-actions";
import type { CompEvent, Court, EventTransaction, CourtHourRate } from "@/lib/database.types";

const CARD = "bg-ink-2 rounded-2xl p-5 flex flex-col gap-3";
const ROW = "flex items-center justify-between gap-3 py-2 border-b border-snow/8 last:border-b-0";

export function KeuanganTab({
  event,
  courts,
  hourRates,
  transactions,
  participantCount,
}: {
  event: CompEvent;
  courts: Court[];
  hourRates: CourtHourRate[];
  transactions: EventTransaction[];
  participantCount: number;
}) {
  const dayOfWeek = event.event_date ? dayOfWeekFromDateStr(event.event_date) : new Date().getDay();
  const rentalCost = courtRentalCost({
    courts: courts.map((c) => ({ basePricePerHour: c.price_per_hour || 0, rates: hourRates.filter((r) => r.court_id === c.id) })),
    dayOfWeek,
    startTime: event.start_time?.slice(0, 5) || "",
    durationHours: event.duration_hours || 2,
  });
  const registrationIncome = (event.price_amount || 0) * participantCount;

  const expenses = transactions.filter((t) => t.type === "expense");
  const income = transactions.filter((t) => t.type === "income");
  const totalExpense = rentalCost + expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = registrationIncome + income.reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpense;

  return (
    <div className="flex flex-col gap-5">
      <div className={CARD}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-snow/75">Pemasukan − Pengeluaran</span>
          <span className={`font-display font-bold text-2xl ${net >= 0 ? "text-volt" : "text-loss"}`}>{formatRupiah(net)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <TransactionList
          title="Pengeluaran"
          total={totalExpense}
          event={event}
          type="expense"
          autoLine={{
            label: courts.length ? `Sewa lapangan · ${courts.length} court × ${event.duration_hours || 2} jam` : "Sewa lapangan",
            amount: rentalCost,
          }}
          items={expenses}
        />
        <TransactionList
          title="Pemasukan"
          total={totalIncome}
          event={event}
          type="income"
          autoLine={{
            label: `Pendaftaran · ${participantCount} ${event.type === "mabar" ? "pemain" : "tim"} × ${formatRupiah(event.price_amount || 0)}`,
            amount: registrationIncome,
          }}
          items={income}
        />
      </div>
    </div>
  );
}

function TransactionList({
  title,
  total,
  event,
  type,
  autoLine,
  items,
}: {
  title: string;
  total: number;
  event: CompEvent;
  type: "expense" | "income";
  autoLine: { label: string; amount: number };
  items: EventTransaction[];
}) {
  return (
    <div className={CARD}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-display font-bold text-lg">{title}</div>
        <div className="font-display font-bold">{formatRupiah(total)}</div>
      </div>

      <div className="flex flex-col">
        <div className={ROW}>
          <span className="text-sm text-snow/85 min-w-0 truncate" title={autoLine.label}>{autoLine.label}</span>
          <span className="font-semibold text-sm flex-none">{formatRupiah(autoLine.amount)}</span>
        </div>
        {items.map((t) => (
          <div key={t.id} className={ROW}>
            <span className="text-sm text-snow/85 min-w-0 truncate" title={t.label}>{t.label}</span>
            <div className="flex items-center gap-2 flex-none">
              <span className="font-semibold text-sm">{formatRupiah(t.amount)}</span>
              <InlineDelete action={deleteEventTransaction} id={t.id} name={t.label} noun={type === "expense" ? "pengeluaran" : "pemasukan"} />
            </div>
          </div>
        ))}
      </div>

      <ActionForm action={addEventTransaction} successText={false} className="flex gap-2 items-end pt-1">
        <input type="hidden" name="event_id" value={event.id} />
        <input type="hidden" name="type" value={type} />
        <div className="flex-1 min-w-0">
          <div className="label">Nama</div>
          <input className="field" name="label" placeholder={type === "expense" ? "Bola, konsumsi, dll" : "Sponsor, dll"} required />
        </div>
        <div className="w-32 flex-none">
          <div className="label">Nominal (Rp)</div>
          <input className="field" type="number" min={0} step={1000} name="amount" required />
        </div>
        <button type="submit" className="btn min-h-11 px-4.5">Tambah</button>
      </ActionForm>
    </div>
  );
}
