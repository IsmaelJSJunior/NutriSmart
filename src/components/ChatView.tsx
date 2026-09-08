import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Image as ImageIcon,
  Sparkles,
  ArrowLeft,
  User,
  Stethoscope,
  Check,
  CheckCheck,
  Loader2,
  X,
  Eye,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { ChatMessage, ReportRecord } from '../types';
import { dataStore } from '../services/storage';
import { compressImageForUpload } from '../lib/utils';
import { requestChatSuggestionAI } from '../services/ai';
import { HistoryDropdown } from './HistoryDropdown';

interface ChatViewProps {
  patientCode: string;
  patientName: string;
  senderRole: 'nutri' | 'patient';
  messages: ChatMessage[];
  latestReport?: ReportRecord;
  reports?: ReportRecord[];
  onBack: () => void;
  onViewReport?: (report?: ReportRecord) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  patientCode,
  patientName,
  senderRole,
  messages,
  latestReport,
  reports = [],
  onBack,
  onViewReport,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [aiDrafting, setAiDrafting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter consultations history for this specific patient
  const patientHistory = reports
    .filter((r) => r.patientCode.toUpperCase() === patientCode.toUpperCase())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const [selectedReportId, setSelectedReportId] = useState<string>(
    latestReport?.id || patientHistory[0]?.id || ''
  );

  const currentSelectedReport = patientHistory.find((r) => r.id === selectedReportId) || latestReport || patientHistory[0];

  // Filter messages for this patient
  const patientMessages = messages.filter(
    (m) => m.patientCode.toUpperCase() === patientCode.toUpperCase()
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [patientMessages.length, selectedImage]);

  // Mark messages as read when viewing as nutritionist
  useEffect(() => {
    if (senderRole === 'nutri') {
      dataStore.markMessagesAsRead(patientCode);
    }
  }, [senderRole, patientCode, patientMessages.length]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    const textToSend = inputText.trim();
    const imageToSend = selectedImage;

    setInputText('');
    setSelectedImage(null);

    await dataStore.sendMessage({
      patientCode,
      sender: senderRole,
      text: textToSend,
      imageUrl: imageToSend,
      timestamp: new Date().toISOString(),
      read: true,
    });

    if (senderRole === 'nutri') {
      dataStore.markMessagesAsRead(patientCode);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageForUpload(file);
      setSelectedImage(compressed);
    } catch (err) {
      console.error('Erro ao comprimir imagem:', err);
    }
  };

  // Nutritionist AI Assistant: Generate Suggested Reply
  const handleGenerateAiReply = async () => {
    const lastPatientMsg = [...patientMessages]
      .reverse()
      .find((m) => m.sender === 'patient');

    setAiDrafting(true);
    try {
      const suggestion = await requestChatSuggestionAI(
        lastPatientMsg?.text || 'Olá Dra! Gostaria de tirar uma dúvida sobre o plano alimentar.',
        patientName,
        currentSelectedReport?.formData.objetivo || 'Emagrecimento',
        currentSelectedReport?.aiMealPlan || 'Plano ativo'
      );
      setInputText(suggestion);
    } catch (err) {
      console.error('Erro ao gerar sugestão de resposta:', err);
    } finally {
      setAiDrafting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-1.5 sm:pt-2 pb-4 h-[calc(100vh-76px)] flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
      {/* Chat Top Header */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 border border-slate-200 shadow-2xs flex items-center justify-between gap-2.5 shrink-0 mb-2.5">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer active:scale-95 shrink-0 shadow-2xs"
            title="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-600 to-sky-600 flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-2xs shrink-0">
            {patientName.charAt(0)}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">{patientName}</h3>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 shrink-0">
                {patientCode}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-emerald-600 font-bold flex items-center gap-1 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>{senderRole === 'nutri' ? 'Canal Direto com o Paciente' : 'Dra. Maria Eduarda Online'}</span>
            </p>
          </div>
        </div>

        {/* Right Action: Consultation History Selector + Ver Ficha */}
        {onViewReport && (
          <div className="flex items-center gap-1.5 shrink-0">
            {senderRole === 'nutri' && patientHistory.length > 1 && (
              <HistoryDropdown
                history={patientHistory}
                selectedReportId={selectedReportId}
                onSelect={(report) => {
                  setSelectedReportId(report.id);
                  onViewReport(report);
                }}
              />
            )}

            <button
              onClick={() => onViewReport(currentSelectedReport)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-bold text-[11px] sm:text-xs border border-emerald-200/80 hover:border-emerald-600 shadow-2xs transition active:scale-95 cursor-pointer shrink-0"
              title="Abrir Ficha Clínica / Prontuário"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver Ficha</span>
            </button>
          </div>
        )}
      </div>

      {/* Messages Thread */}
      <div className="flex-1 bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs overflow-y-auto space-y-3 mb-2.5">
        {patientMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
              <User className="w-6 h-6 text-emerald-500" />
            </div>
            <h4 className="font-bold text-slate-700 text-sm">Início da Conversa</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Envie orientações clínicas, tire dúvidas ou acompanhe fotos de refeições.
            </p>
          </div>
        ) : (
          patientMessages.map((m) => {
            const isMe = m.sender === senderRole;

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-all`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 shadow-2xs text-xs sm:text-sm leading-relaxed ${
                    isMe
                      ? senderRole === 'nutri'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-xs'
                        : 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-100 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  {/* Attached Meal Photo */}
                  {m.imageUrl && (
                    <div className="mb-2 rounded-xl sm:rounded-2xl overflow-hidden border border-white/20">
                      <img
                        src={m.imageUrl}
                        alt="Foto enviada"
                        className="w-full max-h-60 object-cover"
                      />
                    </div>
                  )}

                  <p className="whitespace-pre-wrap">{m.text}</p>

                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isMe ? 'text-white/70' : 'text-slate-400'
                    }`}
                  >
                    <span>
                      {new Date(m.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isMe && <CheckCheck className="w-3 h-3 text-white/90" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview if selected */}
      {selectedImage && (
        <div className="relative mb-2 w-fit bg-white p-2 rounded-2xl border border-slate-200 shadow-md flex items-center gap-2">
          <img src={selectedImage} alt="Preview" className="w-14 h-14 rounded-xl object-cover" />
          <span className="text-xs font-bold text-slate-700">Foto anexada</span>
          <button
            onClick={() => setSelectedImage(null)}
            className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Toolbar - Ultra-Compact Single Line */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 border border-slate-200 shadow-2xs shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Attach Photo button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer shrink-0 shadow-2xs"
            title="Enviar foto do prato / refeição"
          >
            <ImageIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Minimalist AI Quick Reply Button (Sparkles only on the same line) */}
          {senderRole === 'nutri' && (
            <button
              type="button"
              onClick={handleGenerateAiReply}
              disabled={aiDrafting}
              className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-200/80 transition flex items-center justify-center active:scale-95 cursor-pointer shrink-0 disabled:opacity-50 shadow-2xs"
              title="Sugerir Resposta Inteligente com IA"
            >
              {aiDrafting ? (
                <Loader2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 animate-spin text-emerald-600" />
              ) : (
                <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-600" />
              )}
            </button>
          )}

          {/* Message Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              senderRole === 'nutri'
                ? 'Digite sua orientação nutricional...'
                : 'Tire uma dúvida com sua nutricionista...'
            }
            className="flex-1 min-w-0 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition shadow-2xs"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() && !selectedImage}
            className={`p-2 sm:p-2.5 rounded-xl font-bold transition shadow-xs ${
              senderRole === 'nutri'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-sky-600 hover:bg-sky-700 text-white'
            } disabled:opacity-50 active:scale-95 cursor-pointer shrink-0`}
            title="Enviar Mensagem"
          >
            <Send className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export const ChatHubView: React.FC<{
  reports: ReportRecord[];
  messages: ChatMessage[];
  onSelectChat: (patientCode: string, patientName: string) => void;
  onBack: () => void;
}> = ({ reports, messages, onSelectChat, onBack }) => {
  // Unique patients
  const uniquePatients = Array.from(
    new Map(
      reports.map((r) => [
        r.patientCode,
        {
          code: r.patientCode,
          name: r.formData.nome,
          latestReport: r,
        },
      ])
    ).values()
  ) as { code: string; name: string; latestReport: ReportRecord }[];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-1.5 sm:pt-2 pb-10 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
      {/* Top Subheader - Standardized Design System */}
      <div className="flex items-center justify-between bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 border border-sky-100/90 shadow-2xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-sky-100/90 text-sky-700 flex items-center justify-center shadow-2xs border border-sky-200/60 shrink-0">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Central de Mensagens</h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Atendimento e orientações com pacientes em tempo real
            </p>
          </div>
        </div>

        <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200/80 shrink-0">
          Atendimento Direto
        </span>
      </div>

      <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-3.5">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900">Conversas com Pacientes</h2>
          <p className="text-xs text-slate-500 font-medium">
            Selecione um paciente para abrir o chat em tempo real, enviar orientações ou acompanhar fotos
          </p>
        </div>

        {uniquePatients.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs">
            Nenhum paciente cadastrado ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {uniquePatients.map((p) => {
              const pMessages = messages.filter(
                (m) => m.patientCode.toUpperCase() === p.code.toUpperCase()
              );
              const lastMessage = pMessages[pMessages.length - 1];

              return (
                <div
                  key={p.code}
                  onClick={() => onSelectChat(p.code, p.name)}
                  className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 hover:border-indigo-300 bg-slate-50/70 hover:bg-white transition cursor-pointer flex items-center justify-between gap-3 shadow-2xs group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-600 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
                      {p.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-900 text-sm truncate">{p.name}</h4>
                        <span className="text-[10px] font-mono font-bold bg-slate-200 px-1.5 py-0.2 rounded text-slate-700 shrink-0">
                          {p.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate max-w-full">
                        {lastMessage ? lastMessage.text || '📷 [Foto enviada]' : 'Nenhuma mensagem recente'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {lastMessage && (
                      <span className="text-[10px] text-slate-400 font-bold block whitespace-nowrap">
                        {new Date(lastMessage.timestamp).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    )}
                    <span className="text-xs font-bold text-indigo-700 mt-1 block whitespace-nowrap group-hover:translate-x-0.5 transition-transform">
                      Abrir Chat →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
