import React, { useState } from 'react';
import {
  Leaf,
  LogOut,
  Calendar,
  MessageSquare,
  UtensilsCrossed,
  FileSpreadsheet,
  Users,
  Settings,
} from 'lucide-react';
import { UserRole, AppView } from '../types';
import { SettingsModal } from './SettingsModal';

interface NavbarProps {
  role?: UserRole;
  userType?: 'guest' | 'nutri' | 'patient';
  patientCode?: string;
  patientName?: string;
  cloudStatus?: 'synced' | 'connecting' | 'offline';
  unreadChatCount?: number;
  unreadCount?: number;
  currentView?: string;
  onOpenNutriLogin?: () => void;
  onOpenPatientLogin?: () => void;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
  onExportBackup?: () => void;
  onImportBackup?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  role = 'guest',
  userType,
  unreadChatCount = 0,
  unreadCount = 0,
  currentView = 'dashboard',
  onOpenNutriLogin,
  onOpenPatientLogin,
  onNavigate,
  onLogout,
  onExportBackup,
  onImportBackup,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const activeRole = userType || role;
  const activeUnread = unreadChatCount || unreadCount;

  // Guest Header
  if (activeRole === 'guest') {
    return (
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100/90 shadow-2xs print:hidden h-12 sm:h-14 flex items-center w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-2xs">
              <Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-emerald-600/20" />
            </div>
            <div className="font-extrabold text-base sm:text-lg text-slate-800 tracking-tight whitespace-nowrap">
              Nutri<span className="text-emerald-500">Smart</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {onOpenPatientLogin && (
              <button
                onClick={onOpenPatientLogin}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-2xs transition whitespace-nowrap active:scale-95 cursor-pointer"
              >
                Sou Paciente
              </button>
            )}

            {onOpenNutriLogin && (
              <button
                onClick={onOpenNutriLogin}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition whitespace-nowrap active:scale-95 cursor-pointer"
              >
                Acesso Nutricionista
              </button>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Authenticated Nutri / Patient Header
  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-2xs print:hidden h-12 sm:h-14 flex items-center w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 w-full flex items-center justify-between gap-2">
          {/* Brand & Home */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 mr-auto">
            <button
              onClick={() => onNavigate(activeRole === 'nutri' ? 'dashboard' : 'patient-portal')}
              className="flex items-center gap-1.5 sm:gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-2xs group-hover:scale-105 transition-transform">
                <Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-emerald-600/20" />
              </div>
              <div className="font-extrabold text-base sm:text-lg text-slate-800 tracking-tight whitespace-nowrap">
                Nutri<span className="text-emerald-500">Smart</span>
              </div>
            </button>
          </div>

          {/* Action Controls & Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Shortcut buttons if in Nutri mode (Desktop) */}
            {activeRole === 'nutri' && (
              <div className="hidden lg:flex items-center gap-1 bg-slate-100/70 backdrop-blur-md p-1 rounded-2xl border border-slate-200/70">
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    currentView === 'dashboard'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Lobby
                </button>

                <button
                  onClick={() => onNavigate('new-form')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    currentView === 'new-form'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Nova Ficha
                </button>

                <button
                  onClick={() => onNavigate('patients')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    currentView === 'patients'
                      ? 'bg-white text-sky-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-sky-600" />
                  Pacientes
                </button>

                <button
                  onClick={() => onNavigate('agenda')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    currentView === 'agenda'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Agenda
                </button>

                <button
                  onClick={() => onNavigate('chat-hub')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 relative ${
                    currentView === 'chat-hub' || currentView === 'chat-room'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  Chat
                  {activeUnread > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                      {activeUnread}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => onNavigate('kitchen')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    currentView === 'kitchen'
                      ? 'bg-white text-amber-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
                  Receitas
                </button>
              </div>
            )}

            {/* Logout / Sair (positioned to the LEFT of Settings) */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 transition active:scale-95 cursor-pointer shadow-2xs"
              title="Encerrar Sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>

            {/* Settings (positioned to the RIGHT of Logout) */}
            {activeRole === 'nutri' && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-1.5 sm:p-2 bg-white rounded-xl shadow-2xs border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition active:scale-95 cursor-pointer"
                title="Configurações & Backup"
              >
                <Settings className="w-4 h-4 text-slate-600" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Settings & Backup Modal */}
      {showSettings && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onExportBackup={onExportBackup || (() => {})}
          onImportBackup={onImportBackup || (() => {})}
        />
      )}
    </>
  );
};

