import { useState } from 'react';

export default function Login({ onLogin }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState('phone'); // phone -> name -> chat
  const [loading, setLoading] = useState(false);

  const submitPhone = (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    setStep('name');
  };

  const submitName = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim(), name: name.trim() }),
      });
      const data = await res.json();
      onLogin(data.user);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="login-card">
      <div className="login-logo">
        <div className="logo-mark">Q</div>
      </div>
      <h1 className="login-title">quintschat</h1>
      <p className="login-subtitle">
        Chat and call your friends and family, anywhere in the world — over your data or Wi-Fi.
      </p>

      {step === 'phone' ? (
        <form onSubmit={submitPhone} className="login-form">
          <label className="field-label">Enter your phone number</label>
          <input
            className="field-input"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+254 700 000 000"
            autoFocus
          />
          <button type="submit" className="btn-primary" disabled={!phoneNumber.trim()}>
            Continue
          </button>
        </form>
      ) : (
        <div className="login-form">
          <label className="field-label">What should people call you?</label>
          <input
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
          />
          <button type="button" className="btn-primary" onClick={submitName} disabled={loading}>
            {loading ? 'Connecting…' : "Let's go"}
          </button>
        </div>
      )}

      <button className="link-btn" onClick={() => setStep('phone')} style={step === 'phone' ? { visibility: 'hidden' } : {}}>
        ← Change phone number
      </button>
    </div>
  );
}