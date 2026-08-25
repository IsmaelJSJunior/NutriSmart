import React, { useState, useEffect } from 'react';
import {
  ReportRecord,
  Appointment,
  ChatMessage,
  UserRole,
  AppView,
} from './types';
import { dataStore } from './services/storage';
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
    localStorage.removeItem('nutrismart_session_role');
    localStorage.removeItem('nutrismart_session_patient_code');
    showToast('Você encerrou a sessão.');
  };

  // Export Backup
  const handleExportBackup = () => {
    exportBackupJSON(reports, agenda, chatMessages);
    showToast('Arquivo de backup baixado com sucesso!');
  };

  // Import Backup
  const handleImportBackupData = async (data: {
    reports?: ReportRecord[];
    agenda?: Appointment[];
    chatMessages?: ChatMessage[];
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
    setCurrentView('chat-room');
  };

  // Calculate unread chat messages for nutritionist
  const unreadChatCount = chatMessages.filter((m) => m.sender === 'patient').length;

  return (
    <div className={`text-slate-900 flex flex-col relative font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden ${
      role === 'guest' ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-screen'
    }`}>
      {/* 5-Second Clinical Loading Splash Screen */}
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} durationMs={4500} />
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
        onNavigate={(view) => {
          if (view === 'new-form') {
            setFormPatientCode(undefined);
          }
          setCurrentView(view);
        }}
        onExportBackup={handleExportBackup}
        onImportBackup={() => setShowImportBackup(true)}
      />

      {/* Main App View Router */}
      <main className={role === 'guest' ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : 'flex-1 pb-16'}>
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
            onNewConsultation={() => handleNewConsultation()}
            onViewPatients={() => setCurrentView('patients')}
            onViewAgenda={() => setCurrentView('agenda')}
            onViewKitchen={() => setCurrentView('kitchen')}
            onViewChat={() => setCurrentView('chat-hub')}
            onSelectReport={handleOpenReport}
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
              setCurrentView('report-view');
              showToast(`Prescrição inteligente gerada com sucesso para ${report.formData.nome}!`);
            }}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {/* 4. CLINICAL REPORT VIEW (DETAILED OFFICIAL PRESCRIPTION) */}
        {role === 'nutri' && currentView === 'report-view' && activeReport && (
          <ClinicalReportView
            report={activeReport}
            onBack={() => setCurrentView('dashboard')}
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
            onSelectReport={handleOpenReport}
            onNewConsultationForPatient={(code) => handleNewConsultation(code)}
            onDeleteReport={async (id) => {
              await dataStore.deleteReport(id);
              showToast('Prontuário removido.');
            }}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {/* 6. CLINIC AGENDA QUALISAN */}
        {role === 'nutri' && currentView === 'agenda' && (
          <AgendaView agenda={agenda} onBack={() => setCurrentView('dashboard')} />
        )}

        {/* 7. SMART KITCHEN (GASTRONOMY LAB) */}
        {role === 'nutri' && currentView === 'kitchen' && (
          <SmartKitchenView onBack={() => setCurrentView('dashboard')} />
        )}

        {/* 8. CHAT HUB (ALL PATIENT CONVERSATIONS) */}
        {role === 'nutri' && currentView === 'chat-hub' && (
          <ChatHubView
            reports={reports}
            messages={chatMessages}
            onSelectChat={(code, name) => handleOpenChatForPatient(code, name)}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {/* 9. ACTIVE CHAT ROOM (NUTRI SENDER) */}
        {role === 'nutri' && currentView === 'chat-room' && activeChatPatient && (
          <ChatView
            patientCode={activeChatPatient.code}
            patientName={activeChatPatient.name}
            senderRole="nutri"
            messages={chatMessages}
            latestReport={reports.find((r) => r.patientCode === activeChatPatient.code)}
            onBack={() => setCurrentView('chat-hub')}
            onViewReport={() => {
              const rep = reports.find((r) => r.patientCode === activeChatPatient.code);
              if (rep) {
                setActiveReport(rep);
                setCurrentView('report-view');
              }
            }}
          />
        )}

        {/* 10. PATIENT PORTAL DASHBOARD */}
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
