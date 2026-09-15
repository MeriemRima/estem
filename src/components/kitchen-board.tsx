"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/i18n-context";

export type KitchenOrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
};

export type KitchenOrder = {
  id: string;
  status: "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  totalCents: number;
  note: string;
  createdAt: string | Date;
  table: { name: string } | null;
  items: KitchenOrderItem[];
};

const nextStatus: Record<string, KitchenOrder["status"] | null> = {
  PENDING: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
  COMPLETED: null,
  CANCELLED: null,
};

export function KitchenBoard({
  orgId,
  initialOrders,
  restaurantName,
}: {
  orgId: string;
  initialOrders: KitchenOrder[];
  restaurantName?: string;
}) {
  const { t, isRtl, dir } = useI18n();
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [tick, setTick] = useState(0);
  const knownIds = useRef(new Set(initialOrders.map((o) => o.id)));
  const audioCtx = useRef<AudioContext | null>(null);

  const labels: Record<string, string> = {
    PENDING: t.kitchen.pending,
    PREPARING: t.kitchen.preparing,
    READY: t.kitchen.ready,
    COMPLETED: t.kitchen.delivered,
    CANCELLED: t.kitchen.cancelled,
  };

  function timeAgo(value: string | Date) {
    const then = new Date(value).getTime();
    const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
    if (mins < 1) {
      return isRtl ? "الآن" : t.common.language === "en" ? "just now" : "à l'instant";
    }
    return `${mins} ${t.kitchen.minutesAgo}`;
  }

  const beep = useCallback(() => {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      audioCtx.current ??= new Ctx();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    const q = filter === "active" ? "?active=1" : "";
    const res = await fetch(`/api/orgs/${orgId}/orders${q}`);
    if (!res.ok) return;
    const data: KitchenOrder[] = await res.json();
    const incoming = data.filter((o) => o.status === "PENDING" && !knownIds.current.has(o.id));
    if (incoming.length > 0) beep();
    knownIds.current = new Set(data.map((o) => o.id));
    setOrders(data);
  }, [orgId, filter, beep]);

  useEffect(() => {
    const es = new EventSource(`/api/orgs/${orgId}/orders/stream`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "orders_changed" || data.type === "connected") {
          void load();
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [orgId, load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setTick((tState) => tState + 1), 30000);
    return () => clearInterval(id);
  }, []);

  async function updateStatus(orderId: string, status: KitchenOrder["status"]) {
    await fetch(`/api/orgs/${orgId}/orders`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
    await load();
  }

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

  return (
    <div dir={dir} className={isRtl ? "rtl" : ""}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="muted text-sm" style={{ fontFamily: "var(--font-mono)" }}>
            {restaurantName ? `${restaurantName} · ` : ""}
            {t.kitchen.title}
          </p>
          {pendingCount > 0 ? (
            <p className="mt-1 font-semibold text-[var(--brand)]">
              {pendingCount} {t.kitchen.pending}
            </p>
          ) : (
            <p className="muted mt-1 text-sm">{t.kitchen.autoRefresh}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={`btn ${filter === "active" ? "" : "btn-ghost"}`}
            onClick={() => setFilter("active")}
          >
            {t.common.active}
          </button>
          <button
            type="button"
            className={`btn ${filter === "all" ? "" : "btn-ghost"}`}
            onClick={() => setFilter("all")}
          >
            {t.common.all}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void load()}>
            {t.kitchen.autoRefresh}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" key={tick}>
        {orders.map((order) => {
          const next = nextStatus[order.status];
          const isNew = order.status === "PENDING";
          return (
            <article
              key={order.id}
              className="card flex flex-col"
              style={
                isNew
                  ? { borderColor: "var(--brand)", boxShadow: "0 0 0 2px rgba(194,65,12,0.15)" }
                  : undefined
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xl font-semibold">{order.table?.name ?? t.kitchen.table}</div>
                  <div className="muted text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                    {timeAgo(order.createdAt)} · {formatMoney(order.totalCents)}
                  </div>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{
                    background:
                      order.status === "PENDING"
                        ? "var(--brand)"
                        : order.status === "READY"
                          ? "var(--ok)"
                          : "#57534e",
                  }}
                >
                  {labels[order.status]}
                </span>
              </div>
              <ul className="mt-4 flex-1 space-y-1 text-base" style={{ fontFamily: "var(--font-mono)" }}>
                {order.items.map((item) => (
                  <li key={item.id} className="font-medium">
                    {item.quantity}× {item.name}
                  </li>
                ))}
              </ul>
              {order.note ? (
                <p className="muted mt-3 text-sm">
                  {t.kitchen.specialNote} : {order.note}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {next ? (
                  <button className="btn" onClick={() => updateStatus(order.id, next)}>
                    {isRtl ? `← ${labels[next]}` : `→ ${labels[next]}`}
                  </button>
                ) : null}
                {order.status !== "CANCELLED" && order.status !== "COMPLETED" ? (
                  <button
                    className="btn btn-ghost"
                    onClick={() => updateStatus(order.id, "CANCELLED")}
                  >
                    {t.kitchen.cancelOrder}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
        {orders.length === 0 ? (
          <div className="card muted md:col-span-2 xl:col-span-3 text-center py-8">
            <h3 className="font-semibold text-base mb-1">{t.kitchen.noOrdersTitle}</h3>
            <p className="text-xs">{t.kitchen.noOrdersSubtitle}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
