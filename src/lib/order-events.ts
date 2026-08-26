type Listener = (organizationId: string) => void;

const listeners = new Set<Listener>();

export function publishOrderEvent(organizationId: string) {
  for (const listener of listeners) listener(organizationId);
}

export function subscribeOrderEvents(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
