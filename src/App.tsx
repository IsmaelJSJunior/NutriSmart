import React, { useState, useEffect, useMemo } from 'react';
import {
  ReportRecord,
  Appointment,
  ChatMessage,
  RecipeItem,
  UserRole,
  AppView,
} from './types';
import { dataStore, getPinnedPatientCodes } from './services/storage';
import { exportBackupJSON } from './lib/utils';
import { BackgroundDecoration } from './components/BackgroundDecoration';
import { Navbar } from './components/Navbar';
import { LandingView } from './components/LandingView';
import { NutriDashboard } from './components/NutriDashboard';
import { ClinicalFormView } from './components/ClinicalFormView';
import { ClinicalReportView } from './components/ClinicalReportView';
import { PatientsListView } from './components/PatientsListView';
import { AgendaView } from './components/AgendaView';
import { SmartKitchenView } from './components/SmartKitchenView';
import { ChatHubView, ChatView } from './components/ChatView';
import { PatientDashboardView } from './components/PatientDashboardView';
import {
  NutritionCalculatorView,
  CalculatorSessionData,
  DEFAULT_CALCULATOR_SESSION,
} from './components/NutritionCalculatorView';
import { NutriLoginModal } from './components/NutriLoginModal';
import { PatientLoginModal } from './components/PatientLoginModal';
import { ImportBackupModal } from './components/ImportBackupModal';
import { Toast } from './components/Toast';
import { SplashScreen } from './components/SplashScreen';

export default function App() {
  // App State
  const [showSplash, setShowSplash] = useState(true);
  const [role, setRole] = useState<UserRole>('guest');
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [patientCode, setPatientCode] = useState<string>('');

  // Data Collections
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [agenda, setAgenda] = useState<Appointment[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Navigation targets
  const [activeReport, setActiveReport] = useState<ReportRecord | null>(null);
  const [activeChatPatient, setActiveChatPatient] = useState<{ code: string; name: string } | null>(null);
  const [formPatientCode, setFormPatientCode] = useState<string | undefined>(undefined);

  // Modals & UI
  const [showNutriLogin, setShowNutriLogin] = useState(false);
  const [showPatientLogin, setShowPatientLogin] = useState(false);
  const [showImportBackup, setShowImportBackup] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Calculator Session State (in-memory only, starts completely neutral/empty)
  const [calculatorSession, setCalculatorSession] = useState<CalculatorSessionData>(DEFAULT_CALCULATOR_SESSION);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Subscribe to storage updates (Firestore + LocalStorage)
  useEffect(() => {
    const unsubReports = dataStore.subscribeReports((data) => {
      setReports(data);
    });

    const unsubAgenda = dataStore.subscribeAgenda((data) => {
      setAgenda(data);
    });

    const unsubChat = dataStore.subscribeChat((data) => {
      setChatMessages(data);
    });

    // Auto-seed sample patient if local database is empty
    const currentLocalReports = dataStore.getReports();
    if (!currentLocalReports || currentLocalReports.length === 0) {
      dataStore.seedInitialData().catch(console.warn);
    }

    // Check existing session in localStorage
    const savedRole = localStorage.getItem('nutrismart_session_role');
    const savedCode = localStorage.getItem('nutrismart_session_patient_code');
    if (savedRole === 'nutri') {
      setRole('nutri');
      setCurrentView('dashboard');
    } else if (savedRole === 'patient' && savedCode) {
      setRole('patient');
      setPatientCode(savedCode);
      setCurrentView('patient-portal');
    }

    return () => {
      unsubReports();
      unsubAgenda();
      unsubChat();
    };
  }, []);

  // Ensure scroll is at top on screen change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentView]);

  // Login handlers
  const handleNutriLoginSuccess = () => {
    setRole('nutri');
    setCurrentView('dashboard');
    localStorage.setItem('nutrismart_session_role', 'nutri');
    showToast('Bem-vinda, Dra. Maria Eduarda! Sessão iniciada.');
  };

  const handlePatientLoginSuccess = (code: string) => {
    setRole('patient');
    setPatientCode(code);
    setCurrentView('patient-portal');
    localStorage.setItem('nutrismart_session_role', 'patient');
    localStorage.setItem('nutrismart_session_patient_code', code);
    showToast(`Acesso ao Prontuário ${code} realizado com sucesso!`);
  };

  const handleLogout = () => {
    setRole('guest');
    setCurrentView('dashboard');
    setPatientCode('');
    setActiveReport(null);
    setActiveChatPatient(null);
    setCalculatorSession(DEFAULT_CALCULATOR_SESSION);
    localStorage.removeItem('nutrismart_session_role');
    localStorage.removeItem('nutrismart_session_patient_code');
    showToast('Você encerrou a sessão.');
  };

  // Export Complete Backup
  const handleExportBackup = () => {
    const recipes = dataStore.getRecipes();
    const calcState = dataStore.getCalculatorState() || calculatorSession;
    const pinnedPatients = getPinnedPatientCodes();
    exportBackupJSON(reports, agenda, chatMessages, recipes, calcState, pinnedPatients);
    showToast('Arquivo de backup completo baixado com sucesso!');
  };

  // Import Complete Backup
  const handleImportBackupData = async (data: {
    reports?: ReportRecord[];
    agenda?: Appointment[];
    appointments?: Appointment[];
    chatMessages?: ChatMessage[];
    allMessages?: ChatMessage[];
    recipes?: RecipeItem[];
    calculatorState?: any;
    pinnedPatients?: string[];
  }) => {
    await dataStore.restoreBackup(data);
    showToast('Backup restaurado e sincronizado com sucesso!');
  };

  // Return patient from dashboard or patients list
  const handleNewConsultation = (code?: string) => {
    setFormPatientCode(code);
    setCurrentView('new-form');
  };

  const handleOpenReport = (report: ReportRecord) => {
    setActiveReport(report);
    setCurrentView('report-view');
  };

  const handleOpenChatForPatient = (code: string, name?: string) => {
    const patientReports = reports.filter((r) => r.patientCode.toUpperCase() === code.toUpperCase());
    const resolvedName = name || (patientReports.length > 0 ? patientReports[0].formData.nome : code);
    setActiveChatPatient({ code, name: resolvedName });
    dataStore.markMessagesAsRead(code);
    setCurrentView('chat-room');
  };

  // Calculate unread chat messages for nutritionist:
  // Strict rule: Only patient messages that are simultaneously:
  // 1. Unread (read === false)
  // 2. Unanswered by the professional (no subsequent reply from nutri)
  // 3. Not currently open in chat-room
  const unreadChatCount = useMemo(() => {
    return chatMessages.filter((m) => {
      if (m.sender !== 'patient') return false;
      if (m.read === true) return false;

      // If currently open in chat-room with this patient, treat as viewed
      if (
        currentView === 'chat-room' &&
        activeChatPatient?.code &&
        activeChatPatient.code.toUpperCase() === m.patientCode.toUpperCase()
      ) {
        return false;
      }

      // Check if professional has replied after this patient message
      const hasNutriReply = chatMessages.some(
        (reply) =>
          reply.patientCode.toUpperCase() === m.patientCode.toUpperCase() &&
          reply.sender === 'nutri' &&
          new Date(reply.timestamp).getTime() >= new Date(m.timestamp).getTime()
      );
      if (hasNutriReply) return false;

      return true;
    }).length;
  }, [chatMessages, currentView, activeChatPatient]);

  // History stack for multi-level navigation
  const [viewHistory, setViewHistory] = useState<AppView[]>([]);

  const handleNavigate = (view: AppView) => {
    if (view === currentView) return;
    setViewHistory((prev) => [...prev, currentView]);
    if (view === 'new-form') {
      setFormPatientCode(undefined);
    }
    setCurrentView(view);
  };

  const handleBack = () => {
    if (viewHistory.length > 0) {
      const previous = viewHistory[viewHistory.length - 1];
      setViewHistory((prev) => prev.slice(0, -1));
      setCurrentView(previous);
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleGoLobby = () => {
    setViewHistory([]);
    setCurrentView('dashboard');
  };

  return (
    <div className="text-slate-900 flex flex-col relative font-sans selection:bg-emerald-500 selection:text-white min-h-screen w-full">
      {/* 4-Second Clinical Loading Splash Screen */}
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} durationMs={4000} />
      )}

      {/* Dynamic Ambient Background */}
      <BackgroundDecoration />

      {/* Navigation Header */}
      <Navbar
        role={role}
        patientCode={patientCode}
        unreadChatCount={unreadChatCount}
        currentView={currentView}
        onOpenNutriLogin={() => setShowNutriLogin(true)}
        onOpenPatientLogin={() => setShowPatientLogin(true)}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        onBack={handleBack}
        onGoLobby={handleGoLobby}
        onExportBackup={handleExportBackup}
        onImportBackup={() => setShowImportBackup(true)}
      />

      {/* Main App View Router with Fluid Global Transitions */}
      <main
        key={`${role}-${currentView}`}
        className={role === 'guest' ? 'relative z-10 flex-1 min-h-[calc(100vh-3.5rem)] flex flex-col justify-center items-center px-3.5 sm:px-6 py-4 animate-view-transition' : 'relative z-10 flex-1 pb-8 animate-view-transition'}
      >
        {/* 1. GUEST LANDING VIEW */}
        {role === 'guest' && (
          <LandingView
            onSelectNutri={() => setShowNutriLogin(true)}
            onSelectPatient={() => setShowPatientLogin(true)}
            onOpenNutriLogin={() => setShowNutriLogin(true)}
            onOpenPatientLogin={() => setShowPatientLogin(true)}
            patientCount={reports.length}
            unreadCount={unreadChatCount}
            onInjectMock={async () => {
              await dataStore.seedInitialData();
              showToast('Prontuário de demonstração da Ana Silva (ANA1) carregado!');
            }}
          />
        )}

        {/* 2. NUTRI DASHBOARD VIEW */}
        {role === 'nutri' && currentView === 'dashboard' && (
          <NutriDashboard
            reports={reports}
            agenda={agenda}
            onNewConsultation={() => {
              setFormPatientCode(undefined);
              handleNavigate('new-form');
            }}
            onViewPatients={() => handleNavigate('patients')}
            onViewAgenda={() => handleNavigate('agenda')}
            onViewKitchen={() => handleNavigate('kitchen')}
            onViewChat={() => handleNavigate('chat-hub')}
            onViewCalculator={() => handleNavigate('calculator')}
            onSelectReport={(report) => {
              setActiveReport(report);
              handleNavigate('report-view');
            }}
            onExportBackup={handleExportBackup}
            onImportBackup={() => setShowImportBackup(true)}
          />
        )}

        {/* 3. CLINICAL FORM (ANAMNESE & AI PRESCRIÇÃO) */}
        {role === 'nutri' && currentView === 'new-form' && (
          <ClinicalFormView
            existingReports={reports}
            initialPatientCode={formPatientCode}
            onPlanGenerated={(report) => {
              setActiveReport(report);
              handleNavigate('report-view');
              showToast(`Prescrição inteligente gerada com sucesso para ${report.formData.nome}!`);
            }}
            onBack={handleBack}
          />
        )}

        {/* 4. CLINICAL REPORT VIEW (DETAILED OFFICIAL PRESCRIPTION) */}
        {role === 'nutri' && currentView === 'report-view' && activeReport && (
          <ClinicalReportView
            report={activeReport}
            onBack={handleBack}
            onNavigateToChat={(code) => handleOpenChatForPatient(code, activeReport.formData.nome)}
            onUpdateReport={(updated) => {
              setActiveReport(updated);
              showToast('Prontuário atualizado com sucesso!');
            }}
          />
        )}

        {/* 5. PATIENTS EVOLUTION & REPORTS LIST */}
        {role === 'nutri' && currentView === 'patients' && (
          <PatientsListView
            reports={reports}
            messages={chatMessages}
            onOpenChat={(code, name) => handleOpenChatForPatient(code, name)}
            onSelectReport={(report) => {
              setActiveReport(report);
              handleNavigate('report-view');
            }}
            onNewConsultationForPatient={(code) => handleNewConsultation(code)}
            onDeleteReport={async (id) => {
              await dataStore.deleteReport(id);
              showToast('Prontuário removido.');
            }}
            onBack={handleBack}
          />
        )}

        {/* 6. CLINIC AGENDA QUALISAN */}
        {role === 'nutri' && currentView === 'agenda' && (
          <AgendaView agenda={agenda} onBack={handleBack} />
        )}

        {/* 7. SMART KITCHEN (GASTRONOMY LAB) */}
        {role === 'nutri' && currentView === 'kitchen' && (
          <SmartKitchenView onBack={handleBack} />
        )}

        {/* 8. CHAT HUB (ALL PATIENT CONVERSATIONS) */}
        {role === 'nutri' && currentView === 'chat-hub' && (
          <ChatHubView
            reports={reports}
            messages={chatMessages}
            onSelectChat={(code, name) => handleOpenChatForPatient(code, name)}
            onBack={handleBack}
          />
        )}

        {/* 10. ACTIVE CHAT ROOM (NUTRI SENDER) */}
        {role === 'nutri' && currentView === 'chat-room' && activeChatPatient && (
          <ChatView
            patientCode={activeChatPatient.code}
            patientName={activeChatPatient.name}
            senderRole="nutri"
            messages={chatMessages}
            reports={reports}
            latestReport={reports.find((r) => r.patientCode === activeChatPatient.code)}
            onBack={handleBack}
            onViewReport={(selectedRep) => {
              const rep = selectedRep || reports.find((r) => r.patientCode === activeChatPatient.code);
              if (rep) {
                setActiveReport(rep);
                handleNavigate('report-view');
              }
            }}
          />
        )}

        {/* 11. CLINICAL NUTRITION CALCULATOR */}
        {role === 'nutri' && currentView === 'calculator' && (
          <NutritionCalculatorView
            onBack={handleBack}
            sessionData={calculatorSession}
            onUpdateSession={setCalculatorSession}
          />
        )}

        {/* 12. PATIENT PORTAL DASHBOARD */}
        {role === 'patient' && (
          <PatientDashboardView
            patientCode={patientCode}
            patientName={
              reports.find((r) => r.patientCode.toUpperCase() === patientCode.toUpperCase())
                ?.formData.nome || 'Paciente'
            }
            reports={reports}
            messages={chatMessages}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Global Modals */}
      {showNutriLogin && (
        <NutriLoginModal
          onSuccess={handleNutriLoginSuccess}
          onClose={() => setShowNutriLogin(false)}
        />
      )}

      {showPatientLogin && (
        <PatientLoginModal
          reports={reports}
          onSuccess={handlePatientLoginSuccess}
          onClose={() => setShowPatientLogin(false)}
        />
      )}

      {showImportBackup && (
        <ImportBackupModal
          onImport={handleImportBackupData}
          onClose={() => setShowImportBackup(false)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}
