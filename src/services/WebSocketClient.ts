/**
 * WebSocketClient — SRP: manages WS connection only.
 * No data processing. Just connect, disconnect, reconnect, and fire callbacks.
 */

type MessageCallback = (raw: string) => void;

const WS_HOST = window.location.hostname || '127.0.0.1';
const WS_URL = `ws://${WS_HOST}:4173/ws`;
const RECONNECT_DELAY_MS = 3000;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private messageCallbacks: MessageCallback[] = [];
  private connectCallbacks: Array<() => void> = [];
  private disconnectCallbacks: Array<() => void> = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  connect(): void {
    this.shouldReconnect = true;
    this._open();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onMessage(cb: MessageCallback): void {
    this.messageCallbacks.push(cb);
  }

  onConnect(cb: () => void): void {
    this.connectCallbacks.push(cb);
  }

  onDisconnect(cb: () => void): void {
    this.disconnectCallbacks.push(cb);
  }

  send(data: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  private _open(): void {
    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.connectCallbacks.forEach((cb) => cb());
      };

      this.ws.onmessage = (event: MessageEvent) => {
        const raw = typeof event.data === 'string' ? event.data : String(event.data);
        this.messageCallbacks.forEach((cb) => cb(raw));
      };

      this.ws.onclose = () => {
        this.disconnectCallbacks.forEach((cb) => cb());
        this._scheduleReconnect();
      };

      this.ws.onerror = () => {
        // onerror is followed by onclose, which handles reconnect
      };
    } catch {
      this._scheduleReconnect();
    }
  }

  private _scheduleReconnect(): void {
    if (!this.shouldReconnect) return;
    if (this.reconnectTimer !== null) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect) {
        this._open();
      }
    }, RECONNECT_DELAY_MS);
  }
}
