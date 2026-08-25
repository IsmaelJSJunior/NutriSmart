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
  FileText,
} from 'lucide-react';
import { ChatMessage, ReportRecord } from '../types';
import { dataStore } from '../services/storage';
import { compressImageForUpload } from '../lib/utils';
import { requestChatSuggestionAI } from '../services/ai';

interface ChatViewProps {
  patientCode: string;
  patientName: string;
  senderRole: 'nutri' | 'patient';
  messages: ChatMessage[];
  latestReport?: ReportRecord;
  onBack: () => void;
  onViewReport?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  patientCode,
  patientName,
  senderRole,
  messages,
  latestReport,
  onBack,
  onViewReport,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [aiDrafting, setAiDrafting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter messages for this patient
  const patientMessages = messages.filter(
    (m) => m.patientCode.toUpperCase() === patientCode.toUpperCase()
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [patientMessages.length, selectedImage]);

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
    });
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
        latestReport?.formData.objetivo || 'Emagrecimento',
        latestReport?.aiMealPlan || 'Plano ativo'
      );
      setInputText(suggestion);
    } catch (err) {
      console.error('Erro ao gerar sugestão de resposta:', err);
    } finally {
      setAiDrafting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-100px)] flex flex-col">
      {/* Chat Top Header */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-md flex items-center justify-between gap-3 shrink-0 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-sky-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
            {patientName.charAt(0)}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">{patientName}</h3>
              <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                {patientCode}
              </span>
            </div>
            <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {senderRole === 'nutri' ? 'Canal direto com o Paciente' : 'Dra. Maria Eduarda Online'}
            </p>
          </div>
        </div>

        {onViewReport && latestReport && (
          <button
            onClick={onViewReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 font-bold text-xs hover:bg-sky-100 transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ver Prontuário</span>
          </button>
        )}
      </div>

      {/* Messages Thread */}
      <div className="flex-1 bg-white/90 backdrop-blur-md rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-md overflow-y-auto space-y-4 mb-4">
        {patientMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
              <Sparkles className="w-6 h-6 text-emerald-500" />
            </div>
            <h4 className="font-bold text-slate-700 text-sm">Início da Conversa</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Envie dúvidas, orientações clínicas ou fotos de pratos para acompanhamento.
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
                  className={`max-w-[85%] sm:max-w-[70%] rounded-3xl p-4 shadow-xs text-sm leading-relaxed ${
                    isMe
                      ? senderRole === 'nutri'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-xs'
                        : 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-100 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  {/* Attached Meal Photo */}
                  {m.imageUrl && (
                    <div className="mb-2 rounded-2xl overflow-hidden border border-white/20">
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
          <img src={selectedImage} alt="Preview" className="w-16 h-16 rounded-xl object-cover" />
          <span className="text-xs font-bold text-slate-700">Foto anexada</span>
          <button
            onClick={() => setSelectedImage(null)}
            className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Toolbar */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-3 sm:p-4 border border-slate-200 shadow-md shrink-0">
        {/* Nutri AI Quick Reply Button */}
        {senderRole === 'nutri' && (
          <div className="pb-2.5 mb-2.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Assistente Nutricional IA
            </span>

            <button
              type="button"
              onClick={handleGenerateAiReply}
              disabled={aiDrafting}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-xl border border-indigo-200 transition flex items-center gap-1.5"
            >
              {aiDrafting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Gerando sugestão...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  Sugerir Resposta Clínica
                </>
              )}
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="Enviar foto do prato / refeição"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              senderRole === 'nutri'
                ? 'Digite sua orientação nutricional...'
                : 'Tire uma dúvida com sua nutricionista...'
            }
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!inputText.trim() && !selectedImage}
            className={`p-3 rounded-2xl font-bold transition shadow-md ${
              senderRole === 'nutri'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-sky-600 hover:bg-sky-700 text-white'
            } disabled:opacity-50 active:scale-95`}
          >
            <Send className="w-5 h-5" />
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Painel
        </button>

        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
          Central de Atendimento
        </span>
      </div>

      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
        <h2 className="text-xl font-black text-slate-900">Conversas com Pacientes</h2>
        <p className="text-xs text-slate-500">
          Selecione um paciente para abrir o chat em tempo real, enviar orientações ou fotos
        </p>

        {uniquePatients.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs">
            Nenhum paciente cadastrado ainda.
          </div>
        ) : (
          <div className="space-y-2.5">
            {uniquePatients.map((p) => {
              const pMessages = messages.filter(
                (m) => m.patientCode.toUpperCase() === p.code.toUpperCase()
              );
              const lastMessage = pMessages[pMessages.length - 1];

              return (
                <div
                  key={p.code}
                  onClick={() => onSelectChat(p.code, p.name)}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-slate-50/70 hover:bg-white transition cursor-pointer flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-600 text-white font-black text-base flex items-center justify-center shadow-xs">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-900 text-sm">{p.name}</h4>
                        <span className="text-[10px] font-mono font-bold bg-slate-200 px-1.5 py-0.2 rounded text-slate-700">
                          {p.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">
                        {lastMessage ? lastMessage.text || '📷 [Foto enviada]' : 'Nenhuma mensagem recente'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {lastMessage && (
                      <span className="text-[10px] text-slate-400 font-bold block">
                        {new Date(lastMessage.timestamp).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    )}
                    <span className="text-xs font-bold text-indigo-700 mt-1 block">Abrir Chat →</span>
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
