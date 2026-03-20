/**
 * StatusDot — SRP: renders the WebSocket connection indicator only.
 */

interface StatusDotProps {
  isConnected: boolean;
}

export function StatusDot({ isConnected }: StatusDotProps) {
  return (
    <div className="status-dot-wrapper" title={isConnected ? 'Conectado' : 'Desconectado'}>
      <span className={`status-dot ${isConnected ? 'status-dot--connected' : 'status-dot--disconnected'}`} />
      <span className="status-dot-label">{isConnected ? 'WS conectado' : 'WS desconectado'}</span>
    </div>
  );
}
