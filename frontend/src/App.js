import { useState, useRef } from 'react';
import axios from 'axios';
import './App.css';
import DnaHelix from './DnaHelix';
import Intro from './Intro';

const API = 'https://tradegnome-production.up.railway.app';

const CHAINS = [
  { value: 'eth-mainnet',    label: 'Ethereum' },
  { value: 'matic-mainnet',  label: 'Polygon'  },
  { value: 'bsc-mainnet',    label: 'BSC'       },
  { value: 'solana-mainnet', label: 'Solana (premium)' },
];

const RISK_COLORS = {
  Conservative: '#00cc00',
  Moderate:     '#ccaa00',
  Aggressive:   '#cc6600',
  Degen:        '#cc2200',
};

function TermWindow({ title, children, style }) {
  return (
    <div className="term-window" style={style}>
      <div className="term-titlebar">
        <div className="term-titlebar-dots">
          <div className="term-dot" />
          <div className="term-dot" />
          <div className="term-dot" />
        </div>
        <span className="term-titlebar-label">{title}</span>
      </div>
      <div className="term-body">{children}</div>
    </div>
  );
}

export default function App() {
  const [wallet,  setWallet]  = useState('');
  const [chain,   setChain]   = useState('eth-mainnet');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [phase,   setPhase]   = useState('');
  const [intro,   setIntro]   = useState(true);

  async function analyze() {
    if (!wallet.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      setPhase('Fetching on-chain history via GoldRush...');
      await delay(800);
      setPhase('Classifying swaps and bridge events...');
      const res = await axios.post(`${API}/api/analyze`, { wallet: wallet.trim(), chain });
      setPhase('Genome AI engine processing...');
      await delay(600);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
      setPhase('');
    }
  }

  return (
    <div className="app">
      {intro && <Intro onDone={() => setIntro(false)} />}

      <header className="header">
        <div className="logo">
          <span className="logo-icon">🧬</span>
          <span className="logo-text">TRADEGENOME</span>
        </div>
        <p className="tagline">Behavioral cloning for on-chain alpha</p>
      </header>

      <section className="search-section">
        <TermWindow title="genome-sequencer.exe — input">
          <label className="input-label">Wallet Address</label>
          <input
            className="wallet-input"
            placeholder="0x... or solana address"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && analyze()}
          />
          <div className="search-row">
            <select className="chain-select" value={chain} onChange={(e) => setChain(e.target.value)}>
              {CHAINS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <button className="analyze-btn" onClick={analyze} disabled={loading || !wallet.trim()}>
              {loading ? 'Sequencing...' : '[ Sequence Genome ]'}
            </button>
          </div>
          {loading && <DnaHelix phase={phase} />}
          {error && <div className="error-box">{error}</div>}
        </TermWindow>
      </section>

      {result && <Results data={result} />}

      <footer className="footer">
     
      </footer>
    </div>
  );
}

function Results({ data }) {
  const { genome, dataSnapshot, wallet } = data;
  const riskColor = RISK_COLORS[genome.riskProfile] || '#00cc00';

  return (
    <div className="results">

      {/* Genome Hero */}
      <TermWindow title={`genome-output.log — ${wallet.slice(0,10)}...`} style={{ marginBottom: 10, borderTop: `2px solid ${riskColor}` }}>
        <div className="genome-badge" style={{ color: riskColor, borderColor: riskColor }}>
          {genome.riskProfile}
        </div>
        <h1 className="genome-title">{genome.strategyTitle}</h1>
        <p className="genome-oneliner">{genome.oneLiner}</p>
        <div className="genome-body">{genome.genome}</div>
      </TermWindow>

      {/* Stats */}
      <div className="stats-row">
        <StatCard label="total_swaps"    value={dataSnapshot.totalSwaps} />
        <StatCard label="bridge_events"  value={dataSnapshot.totalBridges} />
        <StatCard label="portfolio_usd"  value={safeUsd(dataSnapshot.portfolioUsd)} />
        <StatCard label="stable_buffer"  value={`${dataSnapshot.stablecoinPct ?? 'N/A'}%`} />
        <StatCard label="avg_trade_usd"  value={safeUsd(genome.avgPositionSizeUsd)} />
        <StatCard label="primary_dex"    value={genome.primaryDex || 'none'} />
      </div>

      {/* Two col */}
      <div className="two-col">
        <TermWindow title="behavioral-signals.log">
          <ul className="signal-list">
            {genome.behavioralSignals.map((s, i) => (
              <li key={i} className="signal-item">
                <span className="signal-num">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </TermWindow>

        <TermWindow title="agent-triggers.cfg">
          <p className="panel-sub">{"// Conditions the monitor agent watches for"}</p>
          <ul className="trigger-list">
            {genome.agentTriggers.map((t, i) => (
              <li key={i} className="trigger-item">
                <span className="trigger-dot">▶</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <div className="weakness-box">
            <span className="weakness-label">Strategy Weakness</span>
            <p className="weakness-text">{genome.weaknesses}</p>
          </div>
        </TermWindow>
      </div>

      {/* Holdings */}
      {dataSnapshot.topHoldings?.length > 0 && (
        <TermWindow title="portfolio-snapshot.dat">
          <div className="holdings-row" style={{ padding: 0 }}>
            {dataSnapshot.topHoldings.map((h, i) => (
              <div key={i} className="holding-chip">
                <span className="holding-symbol">{h.symbol}</span>
                <span className="holding-usd">{safeUsd(h.usdValue)}</span>
              </div>
            ))}
          </div>
        </TermWindow>
      )}

      {/* Agent Monitor */}
      <AgentMonitor wallet={wallet} genome={genome} chain={data.chain} />

      <p className="wallet-label">{"// wallet: "}<code>{wallet}</code></p>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function AgentMonitor({ wallet, genome, chain }) {
  const [watching, setWatching] = useState(false);
  const [alerts,   setAlerts]   = useState([]);
  const wsRef = useRef(null);

  function startAgent() {
    axios.post(`${API}/api/agent/start`, { wallet, genome, chain });
    const ws = new WebSocket('ws://localhost:3002/ws');
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'ALERT') setAlerts((prev) => [data.alert, ...prev]);
    };
    wsRef.current = ws;
    setWatching(true);
  }

  function stopAgent() {
    axios.post(`${API}/api/agent/stop`, { wallet });
    wsRef.current?.close();
    setWatching(false);
  }

  return (
    <div className="panel agent-panel" style={{ marginBottom: 10 }}>
      <div className="agent-header">
        <span className="panel-title" style={{ padding: 0, background: 'none', border: 'none' }}>
          monitor-agent.exe
        </span>
        <button
          className={`agent-btn ${watching ? 'agent-btn--stop' : 'agent-btn--start'}`}
          onClick={watching ? stopAgent : startAgent}
        >
          {watching ? '[ Stop ]' : '[ Start Agent ]'}
        </button>
      </div>
      <div className="agent-body">
        {watching && (
          <p className="agent-status">
            <span className="pulse-dot" /> ACTIVE — polling every 60s
          </p>
        )}
        {alerts.length === 0 && watching && (
          <p className="no-alerts">No triggers fired yet. Watching...</p>
        )}
        {alerts.map((a, i) => (
          <div key={i} className="alert-card">
            <div className="alert-top">
              <span className={`alert-conf alert-conf--${a.confidence.toLowerCase()}`}>
                {a.confidence}
              </span>
              <span className="alert-time">{new Date(a.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="alert-trigger">{a.triggerMatched}</p>
            <p className="alert-explain">{a.explanation}</p>
            <p className="alert-action">{a.action}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

function safeUsd(val) {
  const n = Number(val);
  if (!val || isNaN(n) || n === 0) return 'N/A';
  if (n >= 1_000_000_000) return '$' + (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000)     return '$' + (n / 1_000_000).toFixed(1) + 'M';
  return '$' + n.toLocaleString();
}