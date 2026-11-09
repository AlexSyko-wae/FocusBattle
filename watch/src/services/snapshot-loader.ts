// Agrupa avisos simultáneos y nunca entrega datos después de cerrar la sesión.
export function createSnapshotLoader<T>(fetchState: (signal: AbortSignal) => Promise<T>,
  onData: (data: T) => void, onError: () => void) {
  let closed = false;
  let running = false;
  let requested = false;
  let controller: AbortController | null = null;
  async function request() {
    if (closed) return;
    requested = true;
    if (running) return;
    running = true;
    try {
      while (requested && !closed) {
        requested = false;
        controller = new AbortController();
        const timer = setTimeout(() => controller?.abort(), 15000);
        try {
          const data = await fetchState(controller.signal);
          // Si hubo un cambio durante la consulta, recupera el estado más reciente.
          if (!closed && !requested) onData(data);
        } catch { if (!closed) onError(); }
        finally { clearTimeout(timer); }
      }
    } finally { running = false; }
  }
  return { request: () => { void request(); },
    requestIfIdle: () => { if (!running) void request(); },
    close: () => { closed=true; requested=false; controller?.abort(); } };
}
