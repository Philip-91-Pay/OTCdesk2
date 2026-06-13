import { useState, useEffect } from 'react';
import { Clock, ShieldAlert, CheckCircle2, Moon } from 'lucide-react';

export default function AuditBanner() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const isOperational = true;

  const pad = (n: number) => String(n).padStart(2, '0');
  const clockString = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  // Timezone string
  const offset = -now.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const offsetHours = pad(Math.floor(Math.abs(offset) / 60));
  const offsetMin = pad(Math.abs(offset) % 60);
  const tzString = `GMT${sign}${offsetHours}:${offsetMin}`;

  return (
    <div
      id="operational-sla-banner"
      className={`border rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 transition-colors duration-300 ${
        isOperational
          ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
          : 'bg-zinc-50 border-zinc-200 text-zinc-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2.5 rounded-lg flex items-center justify-center ${
            isOperational ? 'bg-emerald-100' : 'bg-zinc-100'
          }`}
        >
          {isOperational ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <Moon className="w-5 h-5 text-zinc-600" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide uppercase font-sans text-zinc-900">
              FX Desk Operational Status: {isOperational ? 'OPEN' : 'PAUSED (CLOSED)'}
            </span>
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                isOperational ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
              }`}
            />
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
            FX Desk is active <strong className="text-zinc-850">24/7 (Open at all times)</strong>. SLA tracking is continuous with no overnight pause to capture live payment processing times. app_initiation_timestamp is uneditable.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white border border-zinc-200 rounded-lg px-4 py-2 mt-2 md:mt-0 font-mono shadow-sm">
        <Clock className="w-4 h-4 text-zinc-400" />
        <div className="text-right">
          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">SYSTEM FEED TIME</div>
          <div className="text-sm font-bold text-zinc-900 tracking-widest">
            {clockString} <span className="text-xs text-zinc-500 font-normal">{tzString}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
