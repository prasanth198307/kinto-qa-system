import { useState, useRef, useEffect } from "react";

interface Message { role: 'user' | 'assistant'; content: string; }

export default function SwachAIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, session_id: sessionId })
      });
      const data = await resp.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.message }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally { setLoading(false); }
  };

  return (
    <>
      {/* Floating button — bottom left so it doesn't clash with other widgets */}
      <button onClick={() => setOpen(o => !o)} style={{
        position: 'fixed', bottom: 20, left: 20, zIndex: 9999,
        width: 48, height: 48, borderRadius: '50%',
        background: '#7C3AED', color: '#fff', border: 'none',
        fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(124,58,237,0.4)'
      }} title="SwachAI Assistant">
        {open ? '×' : '🤖'}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 80, left: 20, zIndex: 9998,
          width: 340, height: 460, background: '#fff', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column',
          border: '1px solid #e5e7eb', fontFamily: 'sans-serif'
        }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', background: '#7C3AED', borderRadius: '12px 12px 0 0', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🤖</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>SwachAI</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>ERP Assistant</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, marginTop: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
                <div>Hi! I'm SwachAI.</div>
                <div style={{ marginTop: 4 }}>Ask me about your tickets, invoices, or business data.</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '8px 12px', borderRadius: 10, fontSize: 13,
                  background: m.role === 'user' ? '#7C3AED' : '#f3f4f6',
                  color: m.role === 'user' ? '#fff' : '#111', lineHeight: 1.4
                }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 4, padding: '8px 12px' }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#9ca3af', animation: `bounce ${0.6+i*0.1}s infinite` }} />)}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: 12, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask SwachAI..." disabled={loading}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, outline: 'none' }}
            />
            <button onClick={send} disabled={loading || !input.trim()} style={{
              padding: '8px 12px', background: '#7C3AED', color: '#fff', border: 'none',
              borderRadius: 8, cursor: 'pointer', fontSize: 13
            }}>↑</button>
          </div>
        </div>
      )}

      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`}</style>
    </>
  );
}
