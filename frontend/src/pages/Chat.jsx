import { useState, useEffect, useRef } from 'react';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId } from '../utils/org';

export default function Chat({ user, onLogout }) {
  const orgId = getEffectiveOrgId(user);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [newRoomName, setNewRoomName] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!orgId) return setLoading(false);
    api.uhpcms.getChatRooms({ org_id: orgId })
      .then((r) => setRooms(r.data || []))
      .catch(() => setRooms([]))
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => {
    if (!selectedRoom) return setMessages([]);
    api.uhpcms.getChatMessages(selectedRoom.id)
      .then((r) => setMessages(r.data || []))
      .catch(() => setMessages([]));
  }, [selectedRoom?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = async (room) => {
    if (!room.is_participant) await api.uhpcms.joinChatRoom(room.id).catch(() => {});
    setSelectedRoom(room);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      await api.uhpcms.createChatRoom({ org_id: orgId, name: newRoomName.trim() });
      const r = await api.uhpcms.getChatRooms({ org_id: orgId });
      setRooms(r.data || []);
      setNewRoomName('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedRoom || !input.trim()) return;
    try {
      await api.uhpcms.sendChatMessage(selectedRoom.id, { body: input.trim() });
      setMessages((prev) => [...prev, { body: input.trim(), sender_id: user?.id, created_at: new Date().toISOString() }]);
      setInput('');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
        <h2 className="section-title">Internal Messaging</h2>
        <div style={{ flex: 1, display: 'flex', gap: '1rem', minHeight: 0 }}>
          <div className="card" style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <form onSubmit={handleCreateRoom} style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" placeholder="New room" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} style={{ flex: 1, padding: '0.4rem' }} />
                <button type="submit" className="btn btn-primary">Add</button>
              </form>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
              {loading ? <p style={{ margin: 0, fontSize: '0.875rem' }}>Loading…</p> : (
                rooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`sidebar-nav-item ${selectedRoom?.id === r.id ? 'active' : ''}`}
                    style={{ width: '100%', textAlign: 'left', marginBottom: 2 }}
                    onClick={() => handleJoin(r)}
                  >
                    {r.name || 'Room'} ({r.message_count ?? 0})
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {selectedRoom ? (
              <>
                <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
                  {selectedRoom.name || 'Chat'}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {messages.map((m, i) => (
                    <div key={i} style={{ alignSelf: m.sender_id === user?.id ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>{m.sender_id === user?.id ? 'You' : m.sender_id}</div>
                      <div style={{ padding: '0.5rem 0.75rem', background: m.sender_id === user?.id ? 'var(--color-primary-light)' : 'var(--color-bg)', borderRadius: 8 }}>
                        {m.body}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{m.created_at}</div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSend} style={{ padding: '0.75rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem' }}>
                  <input type="text" placeholder="Type a message..." value={input} onChange={(e) => setInput(e.target.value)} style={{ flex: 1, padding: '0.5rem 0.75rem' }} />
                  <button type="submit" className="btn-primary">Send</button>
                </form>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                Select a room or create one
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
