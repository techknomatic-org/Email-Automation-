import React, { useEffect, useState } from 'react';
import { getMailboxes, createMailbox } from '../services/api';
import { Mail, CheckCircle2, AlertCircle, Send, RefreshCw, LogOut, Trash2, Key } from 'lucide-react';

export default function Mailboxes() {
  const [mailboxes, setMailboxes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedMailboxId, setSelectedMailboxId] = useState(null);
  
  const [testForm, setTestForm] = useState({
    to_email: '',
    subject: 'OpenOutreach AI Test Email',
    body: 'Hello! This is a real test email sent from OpenOutreach AI outreach pipeline.'
  });

  const [formData, setFormData] = useState({
    username: '',
    from_address: '',
    password: '',
    host: 'smtp.gmail.com',
    port: 587,
    imap_host: 'imap.gmail.com',
    imap_port: 993,
  });

  const [loading, setLoading] = useState(false);

  const fetchMailboxes = async () => {
    try {
      const data = await getMailboxes();
      setMailboxes(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMailboxes();
  }, []);

  const handleDisconnect = async (id) => {
    if (!window.confirm('Disconnect this mailbox?')) return;
    try {
      await fetch(`http://127.0.0.1:8000/api/v1/mailboxes/${id}/disconnect`, { method: 'POST' });
      fetchMailboxes();
    } catch (err) {
      alert('Disconnect error: ' + err.message);
    }
  };

  const handleDeleteMailbox = async (id) => {
    if (!window.confirm('Delete this mailbox permanently from your sending list?')) return;
    try {
      await fetch(`http://127.0.0.1:8000/api/v1/mailboxes/${id}`, { method: 'DELETE' });
      fetchMailboxes();
    } catch (err) {
      alert('Delete mailbox error: ' + err.message);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!selectedMailboxId) return;
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/mailboxes/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mailbox_id: selectedMailboxId,
          to_email: testForm.to_email,
          subject: testForm.subject,
          body: testForm.body
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert('❌ Sending Failed: ' + (data.detail || 'Failed to send test email'));
      } else {
        alert(`🎉 Success! Real Email Sent to ${testForm.to_email}.\nMessage ID: ${data.message_id || 'SMTP Delivered'}`);
        setShowTestModal(false);
      }
    } catch (err) {
      alert('Send test email error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createMailbox(formData);
      alert('✔ Mailbox saved and connected successfully!');
      setShowModal(false);
      fetchMailboxes();
    } catch (err) {
      alert('Error saving SMTP credentials: ' + (err.response?.data?.detail || err.message));
    }
  };

  const openConnectModal = (mailbox = null) => {
    if (mailbox) {
      setFormData({
        username: mailbox.username || mailbox.from_address,
        from_address: mailbox.from_address,
        password: '',
        host: mailbox.host || 'smtp.gmail.com',
        port: mailbox.port || 587,
        imap_host: mailbox.imap_host || 'imap.gmail.com',
        imap_port: mailbox.imap_port || 993,
      });
    } else {
      setFormData({
        username: '',
        from_address: '',
        password: '',
        host: 'smtp.gmail.com',
        port: 587,
        imap_host: 'imap.gmail.com',
        imap_port: 993,
      });
    }
    setShowModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Bar */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Sending Mailboxes</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem', margin: 0 }}>
              Connect your real Gmail address (App Password / SMTP) to send real outreach emails.
            </p>
          </div>

          <div>
            <button
              className="btn"
              style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => openConnectModal()}
            >
              <Key size={16} /> + Connect Gmail (App Password / SMTP)
            </button>
          </div>
        </div>
      </div>

      {/* SMTP / Gmail App Password Connection Modal */}
      {showModal && (
        <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={18} style={{ color: 'var(--accent)' }} /> Connect Gmail via App Password (SMTP)
            </h3>
            <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }} onClick={() => setShowModal(false)}>✕ Close</button>
          </div>

          <div style={{ backgroundColor: 'var(--accent-light)', padding: '0.8rem 1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid rgba(232, 98, 44, 0.2)', fontSize: '0.82rem', color: 'var(--text-main)' }}>
            <strong>💡 Quick 30-Second Setup:</strong>
            <ol style={{ margin: '0.4rem 0 0 1.2rem', padding: 0 }}>
              <li>Open <strong>myaccount.google.com/apppasswords</strong> in your browser.</li>
              <li>Generate a 16-character <strong>App Password</strong>.</li>
              <li>Paste your Gmail address and 16-character App Password below.</li>
            </ol>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Sending Email Address (From)</label>
              <input
                className="form-control"
                required
                type="email"
                value={formData.from_address}
                onChange={(e) => setFormData({ ...formData, from_address: e.target.value, username: e.target.value })}
                placeholder="e.g. khalekarpooja16@gmail.com"
              />
            </div>
            <div className="form-group">
              <label>Google App Password (16-character code)</label>
              <input
                className="form-control"
                required
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="abcd efgh ijkl mnop"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>SMTP Host</label>
                <input
                  className="form-control"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>SMTP Port</label>
                <input
                  className="form-control"
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                />
              </div>
            </div>
            <button type="submit" className="btn" style={{ backgroundColor: '#4f46e5', color: '#fff', fontWeight: 600 }}>
              💾 Save & Connect Gmail Mailbox
            </button>
          </form>
        </div>
      )}

      {/* Send Test Email Modal */}
      {showTestModal && (
        <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399' }}>
              <Send size={16} /> Send Real Test Email
            </h3>
            <button className="btn" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }} onClick={() => setShowTestModal(false)}>✕ Close</button>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Sending from: <strong>{mailboxes.find(m => m.id === selectedMailboxId)?.from_address}</strong>
          </p>

          <form onSubmit={handleSendTestEmail}>
            <div className="form-group">
              <label>Recipient Email Address</label>
              <input
                className="form-control"
                required
                type="email"
                value={testForm.to_email}
                onChange={e => setTestForm({ ...testForm, to_email: e.target.value })}
                placeholder="recipient@example.com"
              />
            </div>
            <div className="form-group">
              <label>Subject</label>
              <input
                className="form-control"
                required
                type="text"
                value={testForm.subject}
                onChange={e => setTestForm({ ...testForm, subject: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Body</label>
              <textarea
                className="form-control"
                rows="3"
                value={testForm.body}
                onChange={e => setTestForm({ ...testForm, body: e.target.value })}
              />
            </div>
            <button type="submit" className="btn" disabled={loading} style={{ backgroundColor: '#10b981', color: '#fff', fontWeight: 600 }}>
              {loading ? '🚀 Sending Email...' : '🚀 Send Real Email Now'}
            </button>
          </form>
        </div>
      )}

      {/* Mailboxes Cards & Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>From Address</th>
              <th>Provider</th>
              <th>Authentication</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mailboxes.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No mailboxes connected yet. Click <b>+ Connect Gmail (App Password / SMTP)</b> to link your Gmail account.
                </td>
              </tr>
            ) : (
              mailboxes.map((m) => {
                const isDisconnected = m.auth_type === 'disconnected';

                return (
                  <tr key={m.id}>
                    <td>#{m.id}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>{m.from_address}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.username}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                        Gmail / Custom SMTP
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid rgba(232, 98, 44, 0.25)' }}>
                        App Password / SMTP
                      </span>
                    </td>
                    <td>
                      {isDisconnected ? (
                        <span className="badge" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>Disconnected</span>
                      ) : (
                        <span className="badge badge-emailed">Connected 🟢</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button
                          className="btn"
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}
                          onClick={() => {
                            setSelectedMailboxId(m.id);
                            setShowTestModal(true);
                          }}
                        >
                          <Send size={12} style={{ marginRight: '3px', display: 'inline' }} /> Send Email
                        </button>

                        <button
                          className="btn"
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}
                          onClick={() => openConnectModal(m)}
                        >
                          <RefreshCw size={12} style={{ marginRight: '3px', display: 'inline' }} /> {isDisconnected ? 'Connect' : 'Update Credentials'}
                        </button>

                        {!isDisconnected && (
                          <button
                            className="btn"
                            style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}
                            onClick={() => handleDisconnect(m.id)}
                          >
                            <LogOut size={12} style={{ marginRight: '3px', display: 'inline' }} /> Disconnect
                          </button>
                        )}

                        <button
                          className="btn"
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.4rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                          onClick={() => handleDeleteMailbox(m.id)}
                          title="Delete Mailbox"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
