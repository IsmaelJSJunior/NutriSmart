import React, { useState } from 'react';
import {
  LogOut,
  Calendar,
  MessageSquare,
  UtensilsCrossed,
  FileSpreadsheet,
  Users,
  Settings,
  ArrowLeft,
  LayoutDashboard,
  Calculator,
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
  onBack?: () => void;
  onGoLobby?: () => void;
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
  onBack,
  onGoLobby,
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
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100/90 shadow-2xs print:hidden h-11 sm:h-12 flex items-center w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 group cursor-default">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 border-0 ring-0 transition-transform duration-300 hover:scale-105 group-hover:scale-105 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
              <img src="/logo.png" alt="NutriSmart Logo" className="w-full h-full object-cover rounded-full border-0" />
            </div>
            <div className="font-extrabold text-base sm:text-lg text-slate-800 tracking-tight whitespace-nowrap transition-all duration-300 hover:brightness-110 group-hover:brightness-110">
              Nutri<span className="text-emerald-500">Smart</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {onOpenPatientLogin && (
              <button
                onClick={onOpenPatientLogin}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 shadow-sm shadow-sky-500/20 transition whitespace-nowrap active:scale-95 cursor-pointer"
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
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-2xs print:hidden h-11 sm:h-12 flex items-center w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 w-full flex items-center justify-between gap-2">
          {/* Brand, Back Button & Home (Strict Left-to-Right Sequence) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 mr-auto min-w-0">
            {/* 1. Logo NutriSmart */}
            <button
              onClick={() => onNavigate(activeRole === 'nutri' ? 'dashboard' : 'patient-portal')}
              className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer shrink-0"
              title="Ir para tela inicial"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 border-0 ring-0 transition-transform duration-300 hover:scale-105 group-hover:scale-105 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                <img src="/logo.png" alt="NutriSmart Logo" className="w-full h-full object-cover rounded-full border-0" />
              </div>
              <div className="font-extrabold text-base sm:text-lg text-slate-800 tracking-tight whitespace-nowrap transition-all duration-300 hover:brightness-110 group-hover:brightness-110">
                Nutri<span className="text-emerald-500">Smart</span>
              </div>
            </button>

            {/* 2. Botão Voltar (Seta) ➔ 3. Botão Início / Lobby (Home) */}
            {activeRole === 'nutri' && currentView !== 'dashboard' && (
              <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 sm:p-1 rounded-2xl border border-slate-200/80 shadow-2xs shrink-0">
                {/* 2. Botão Voltar */}
                <button
                  onClick={onBack || (() => onNavigate('dashboard'))}
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/60 shadow-2xs transition active:scale-95 cursor-pointer group"
                  title="Voltar à tela anterior"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-600 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="hidden md:inline">Voltar</span>
                </button>

                {/* 3. Botão Início / Lobby (Oculto em telas grandes/desktop onde o menu de navegação superior já exibe o Lobby) */}
                <button
                  onClick={onGoLobby || (() => onNavigate('dashboard'))}
                  className="flex lg:hidden items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/60 shadow-2xs transition active:scale-95 cursor-pointer group"
                  title="Ir para o Lobby Principal"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-105 transition-transform" />
                  <span className="hidden md:inline">Lobby</span>
                </button>
              </div>
            )}
          </div>

          {/* Action Controls & Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Shortcut buttons if in Nutri mode (Desktop) */}
            {activeRole === 'nutri' && (
              <div className="hidden lg:flex items-center gap-1 bg-slate-100/70 backdrop-blur-md p-1 rounded-2xl border border-slate-200/70">
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    currentView === 'dashboard'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
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
                  Ficha Clínica
                </button>

                <button
                  onClick={() => onNavigate('patients')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 relative ${
                    currentView === 'patients' || currentView === 'chat-hub' || currentView === 'chat-room'
                      ? 'bg-white text-sky-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-sky-600" />
                  Pacientes
                  {activeUnread > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                      {activeUnread}
                    </span>
                  )}
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

                <button
                  onClick={() => onNavigate('calculator')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    currentView === 'calculator'
                      ? 'bg-white text-teal-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5 text-teal-600" />
                  Calculadora
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

