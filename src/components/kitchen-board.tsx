"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/utils";

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
};

type Order = {
  id: string;
  status: "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  totalCents: number;
  note: string;
  createdAt: string | Date;
  table: { name: string } | null;
  items: OrderItem[];
};

const nextStatus: Record<string, Order["status"] | null> = {
  PENDING: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
  COMPLETED: null,
  CANCELLED: null,
};

const labels: Record<string, string> = {
  PENDING: "Nouvelle",
  PREPARING: "En prep",
  READY: "Prête",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

function timeAgo(value: string | Date) {
  const then = new Date(value).getTime();
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 1) return "à l'instant";
  if (mins === 1) return "il y a 1 min";
  return `il y a ${mins} min`;
}

export function KitchenBoard({
  orgId,
  initialOrders,
  restaurantName,
}: {
  orgId: string;
  initialOrders: Order[];
  restaurantName?: string;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [tick, setTick] = useState(0);
  const knownIds = useRef(new Set(initialOrders.map((o) => o.id)));
  const audioCtx = useRef<AudioContext | null>(null);

  const beep = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    const data: Order[] = await res.json();
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
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  async function updateStatus(orderId: string, status: Order["status"]) {
    await fetch(`/api/orgs/${orgId}/orders`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
    await load();
  }

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="muted text-sm" style={{ fontFamily: "var(--font-mono)" }}>
            {restaurantName ? `${restaurantName} · ` : ""}
            Réception des commandes clients (SSE)
          </p>
          {pendingCount > 0 ? (
            <p className="mt-1 font-semibold text-[var(--brand)]">
              {pendingCount} nouvelle{pendingCount > 1 ? "s" : ""} commande{pendingCount > 1 ? "s" : ""}
            </p>
          ) : (
            <p className="muted mt-1 text-sm">En écoute…</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={`btn ${filter === "active" ? "" : "btn-ghost"}`}
            onClick={() => setFilter("active")}
          >
            Actives
          </button>
          <button
            type="button"
            className={`btn ${filter === "all" ? "" : "btn-ghost"}`}
            onClick={() => setFilter("all")}
          >
            Historique
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void load()}>
            Rafraîchir
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
                  <div className="text-xl font-semibold">{order.table?.name ?? "Sans table"}</div>
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
              {order.note ? <p className="muted mt-3 text-sm">Note : {order.note}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {next ? (
                  <button className="btn" onClick={() => updateStatus(order.id, next)}>
                    → {labels[next]}
                  </button>
                ) : null}
                {order.status !== "CANCELLED" && order.status !== "COMPLETED" ? (
                  <button
                    className="btn btn-ghost"
                    onClick={() => updateStatus(order.id, "CANCELLED")}
                  >
                    Annuler
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
        {orders.length === 0 ? (
          <div className="card muted md:col-span-2 xl:col-span-3">
            {filter === "active"
              ? "Aucune commande active. Les commandes QR apparaîtront ici en direct."
              : "Aucun historique pour l’instant."}
          </div>
        ) : null}
      </div>
    </div>
  );
}
