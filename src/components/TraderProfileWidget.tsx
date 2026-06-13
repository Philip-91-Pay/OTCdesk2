import { useState } from 'react';
import { FX_USERS, FXUser, FXUserProfile } from '../types';
import { Users, Shield, Check } from 'lucide-react';

interface TraderProfileWidgetProps {
  activeUser: FXUserProfile;
  onChangeUser: (user: FXUserProfile) => void;
}

export default function TraderProfileWidget({
  activeUser,
  onChangeUser,
}: TraderProfileWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div id="trader-selector-container" className="relative z-50">
      <button
        id="trader-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-2 hover:bg-zinc-50 transition-all text-left shadow-sm cursor-pointer"
      >
        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white font-bold text-sm shadow">
          {activeUser.username.substring(0, 1)}
        </div>
        <div className="hidden sm:block">
          <div className="text-[10px] font-bold font-mono text-zinc-400 flex items-center gap-1 uppercase">
            <Shield className="w-3 h-3 text-zinc-500" />
            {activeUser.role}
          </div>
          <div className="text-sm font-bold text-[#1A1A1A]">
            {activeUser.username}
          </div>
        </div>
      </button>

      {isOpen && (
        <>
          <div
            id="trader-dropdown-backdrop"
            className="fixed inset-0"
            onClick={() => setIsOpen(false)}
          />
          <div
            id="trader-dropdown-menu"
            className="absolute right-0 mt-2 w-64 bg-white border border-zinc-200 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-3 duration-200 text-zinc-900"
          >
            <div className="px-4 py-2 border-b border-zinc-100">
              <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3" />
                Change Active Desk User
              </span>
            </div>
            <div className="py-1">
              {FX_USERS.map((user) => {
                const isSelected = user.username === activeUser.username;
                return (
                  <button
                    id={`trader-option-${user.username}`}
                    key={user.username}
                    onClick={() => {
                      onChangeUser(user);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-zinc-50 cursor-pointer ${
                      isSelected ? 'bg-zinc-100 font-bold text-zinc-900' : 'text-zinc-650'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-zinc-200 font-bold text-xs flex items-center justify-center text-zinc-700">
                        {user.username.substring(0, 1)}
                      </div>
                      <div>
                        <div className="font-bold text-zinc-805">{user.username}</div>
                        <div className="text-[10px] text-zinc-400">{user.email}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-zinc-900 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
