import React, { useEffect, useState } from 'react';
import { Globe, RefreshCcw, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { UserConfig } from '../types';
import { aiClient } from '../services/aiClient';

interface AiServerSettingsProps {
  userConfig: UserConfig;
  onUpdateUserConfig: (updated: UserConfig) => void;
}

export const AiServerSettings: React.FC<AiServerSettingsProps> = ({ userConfig, onUpdateUserConfig }) => {
  const [serverUrl, setServerUrl] = useState(userConfig.aiServerUrl || '');
  const [status, setStatus] = useState<string>('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setServerUrl(userConfig.aiServerUrl || '');
  }, [userConfig.aiServerUrl]);

  const saveServerUrl = () => {
    const cleanUrl = serverUrl.trim();
    onUpdateUserConfig({
      ...userConfig,
      aiServerUrl: cleanUrl || undefined,
    });
    setStatus(cleanUrl ? 'Saved. NEXUS will use this AI server on every launch.' : 'Cleared. NEXUS will fall back to local defaults.');
  };

  const resetServerUrl = () => {
    setServerUrl('');
    onUpdateUserConfig({
      ...userConfig,
      aiServerUrl: undefined,
    });
    setStatus('Reset to default behavior.');
  };

  const testConnection = async () => {
    setTesting(true);
    setStatus('Testing connection...');
    try {
      const res = await aiClient.health();
      setStatus(`Connected: ${res.aiProvider || res.provider || 'AI server'} is online.`);
    } catch (err: any) {
      setStatus(err?.detail || err?.message || 'Could not reach the AI server.');
    } finally {
      setTesting(false);
    }
  };

  const hasCustomUrl = !!userConfig.aiServerUrl?.trim();

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-zinc-950/85 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 flex items-center justify-center shrink-0">
          <Globe className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white">AI Server</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Save a permanent backend URL here so the AI uses the same server every time you open the app on your phone.
          </p>
        </div>
        {hasCustomUrl ? (
          <span className="text-[10px] font-mono uppercase text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-2 py-1">
            Saved
          </span>
        ) : (
          <span className="text-[10px] font-mono uppercase text-zinc-400 bg-zinc-800/60 border border-zinc-700 rounded-lg px-2 py-1">
            Default
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <input
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          placeholder="https://your-ai-server.com or http://192.168.1.10:3000"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60"
        />
        <button
          type="button"
          onClick={saveServerUrl}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
        >
          <ShieldCheck className="w-4 h-4" />
          Save
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={testConnection}
          disabled={testing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 hover:text-white hover:border-violet-500/40 disabled:opacity-50"
        >
          {testing ? <Wifi className="w-4 h-4 text-violet-300 animate-pulse" /> : <Wifi className="w-4 h-4 text-violet-300" />}
          Test Connection
        </button>
        <button
          type="button"
          onClick={resetServerUrl}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 hover:text-white hover:border-violet-500/40"
        >
          <RefreshCcw className="w-4 h-4 text-zinc-300" />
          Reset
        </button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-[11px] text-zinc-400 leading-relaxed">
        <p>
          For a phone that stays online, the AI backend must be reachable all the time. That usually means a hosted URL,
          a tunnel like ngrok/Cloudflare Tunnel, or a PC that stays on with a stable LAN address.
        </p>
      </div>

      {status && (
        <p className="text-[11px] text-violet-200/90 flex items-center gap-2">
          {status.toLowerCase().includes('connected') || status.toLowerCase().includes('online') ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-rose-300" />
          )}
          <span>{status}</span>
        </p>
      )}
    </div>
  );
};
