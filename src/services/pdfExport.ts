import { ReportRecord } from '../types';
import { calculateIMC } from '../lib/utils';

/**
 * Motor Editorial Clínico para Impressão e Exportação em PDF (Padrão A4)
 * Gera um documento clínico de alto padrão visual sem truncamento de texto,
 * com quebras de página inteligentes e identificação institucional completa.
 */
export function generateClinicalDocumentHTML(report: ReportRecord): string {
  const { formData } = report;
  const imcObj = calculateIMC(formData.peso, formData.altura);

  const pesoNum = parseFloat(formData.peso || '');
  const waterGoalMl =
    !isNaN(pesoNum) && pesoNum > 0
      ? Math.round(pesoNum * 40)
      : parseFloat(formData.agua || '')
      ? Math.round(
          parseFloat(formData.agua) * (parseFloat(formData.agua) > 20 ? 1 : 1000)
        )
      : 2500;

  const mealPlanText = report.aiData?.mealPlan || report.aiMealPlan || '';
  const trainingText = report.aiData?.training || '';
  const supplementsText = report.aiData?.supplements || '';
  const deficienciasText = report.aiData?.deficiencias || '';

  // Soma de 9 dobras cutâneas
  const dobrasKeys = [
    formData.dobraTriceps,
    formData.dobraSubescapular,
    formData.dobraAxilarMedia,
    formData.dobraPeitoral,
    formData.dobraSuprailiaca,
    formData.dobraAbdominal,
    formData.dobraCoxa,
    formData.dobraPanturrilha,
    formData.dobraBiceps,
  ];
  const somaDobras = dobrasKeys.reduce((acc, val) => {
    const num = parseFloat(val || '0');
    return acc + (isNaN(num) ? 0 : num);
  }, 0);

  const dateFormatted = new Date(report.date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const printTimestamp = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Prontuário e Prescrição Clínica - ${formData.nome || 'Paciente'} - NutriClinical</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 15mm 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.5;
      font-size: 11pt;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .page-break-avoid {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .header-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #059669;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand-block {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-img {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid #059669;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }
    .brand-title {
      font-size: 18pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-title span {
      color: #059669;
    }
    .brand-subtitle {
      font-size: 9pt;
      color: #64748b;
      font-weight: 600;
      margin-top: 1px;
    }
    .header-meta {
      text-align: right;
      font-size: 8.5pt;
      color: #475569;
    }
    .badge-official {
      display: inline-block;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      padding: 2px 8px;
      border-radius: 999px;
      font-weight: 800;
      font-size: 7.5pt;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    /* Patient Identification Card */
    .patient-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 12px;
    }
    .patient-info-item {
      display: flex;
      flex-direction: column;
    }
    .patient-info-label {
      font-size: 7pt;
      text-transform: uppercase;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .patient-info-value {
      font-size: 10pt;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }
    .section-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 18px;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #e2e8f0;
    }
    .section-number {
      background: #059669;
      color: white;
      width: 20px;
      height: 20px;
      border-radius: 6px;
      font-size: 9pt;
      font-weight: 900;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .section-title {
      font-size: 12pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.3px;
    }
    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .metric-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 10px;
      text-align: center;
    }
    .metric-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .metric-val {
      font-size: 13pt;
      font-weight: 900;
      color: #0f172a;
      margin-top: 1px;
    }
    .metric-val-sm {
      font-size: 8pt;
      font-weight: 700;
      color: #059669;
    }
    /* Clinical Tables */
    .table-custom {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      margin-bottom: 12px;
      font-size: 9pt;
    }
    .table-custom th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 800;
      text-align: left;
      padding: 6px 10px;
      border: 1px solid #cbd5e1;
      font-size: 8pt;
      text-transform: uppercase;
    }
    .table-custom td {
      padding: 5px 10px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .table-custom tr:nth-child(even) {
      background: #f8fafc;
    }
    .grid-circunferencias {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-top: 6px;
      margin-bottom: 12px;
    }
    .circ-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
    }
    .circ-label {
      font-size: 7pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .circ-val {
      font-size: 9.5pt;
      font-weight: 800;
      color: #0f172a;
    }
    /* Dobras Cutâneas Grid */
    .grid-dobras {
      display: grid;
      grid-template-columns: repeat(9, 1fr);
      gap: 4px;
      margin-top: 6px;
      margin-bottom: 12px;
      text-align: center;
    }
    .dobra-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 2px;
    }
    .dobra-label {
      font-size: 6.5pt;
      font-weight: 700;
      color: #64748b;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .dobra-val {
      font-size: 9pt;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }
    /* Flowing Editorial Text Blocks */
    .editorial-content-box {
      background: #fcfdfd;
      border: 1px solid #e2e8f0;
      border-left: 3.5px solid #059669;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 9.5pt;
      line-height: 1.6;
      color: #1e293b;
      white-space: pre-wrap;
      word-break: break-word;
      overflow: visible;
      height: auto;
      margin-top: 6px;
      margin-bottom: 14px;
      font-family: inherit;
    }
    .editorial-content-box.sky-theme {
      border-left-color: #0284c7;
      background: #f8fafc;
    }
    .editorial-content-box.purple-theme {
      border-left-color: #9333ea;
      background: #faf5ff;
    }
    .editorial-content-box.amber-theme {
      border-left-color: #d97706;
      background: #fffbeb;
    }
    /* Footer */
    .document-footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #64748b;
    }
    .confidential-notice {
      max-width: 70%;
      font-style: italic;
    }
  </style>
</head>
<body>
  <!-- Header Oficial -->
  <div class="header-container">
    <div class="brand-block">
      <img src="/logo.png" alt="NutriClinical Logo" class="logo-img" />
      <div>
        <div class="brand-title">Nutri<span>Clinical</span></div>
        <div class="brand-subtitle">Dra. Maria Eduarda • Nutrição Clínica Funcional & Esportiva</div>
      </div>
    </div>
    <div class="header-meta">
      <div class="badge-official">Prescrição Clínica Oficial</div>
      <div><strong>Data de Atendimento:</strong> ${dateFormatted}</div>
      ${report.fichaNumber ? `<div><strong>Consulta Nº:</strong> ${report.fichaNumber}</div>` : ''}
      <div><strong>Emissão do Documento:</strong> ${printTimestamp}</div>
    </div>
  </div>

  <!-- Identificação Completa do Paciente -->
  <div class="patient-card">
    <div class="patient-info-item">
      <span class="patient-info-label">Paciente</span>
      <span class="patient-info-value">${formData.nome || 'Não informado'}</span>
    </div>
    <div class="patient-info-item">
      <span class="patient-info-label">Idade / Sexo</span>
      <span class="patient-info-value">${formData.idade ? `${formData.idade} anos` : '--'} • ${formData.sexo === 'M' ? 'Masc.' : formData.sexo === 'F' ? 'Fem.' : (formData.sexo || '--')}</span>
    </div>
    <div class="patient-info-item">
      <span class="patient-info-label">Código de Acesso</span>
      <span class="patient-info-value font-mono" style="color: #0284c7;">${report.patientCode || '--'}</span>
    </div>
    <div class="patient-info-item">
      <span class="patient-info-label">Contato</span>
      <span class="patient-info-value" style="font-size: 8.5pt;">${formData.telefone || '--'}</span>
    </div>
  </div>

  <!-- Bloco 1: Dados Clínicos & Anamnese -->
  <div class="page-break-avoid">
    <div class="section-title-wrap">
      <span class="section-number">1</span>
      <h2 class="section-title">Dados Clínicos & Anamnese Nutricional</h2>
    </div>

    <table class="table-custom">
      <tbody>
        <tr>
          <td style="width: 25%; font-weight: 800; background: #f8fafc;">Objetivo Clínico:</td>
          <td style="font-weight: 700; color: #047857;">${formData.objetivo || 'Não informado'}</td>
          <td style="width: 20%; font-weight: 800; background: #f8fafc;">Estratégia Nutricional:</td>
          <td style="font-weight: 700;">${formData.tipoDieta || 'Personalizada'}</td>
        </tr>
        <tr>
          <td style="font-weight: 800; background: #f8fafc;">Restrições / Alergias:</td>
          <td colspan="3">${formData.restricoes || 'Nenhuma restrição alimentar severa relatada'}</td>
        </tr>
        ${
          formData.sintomas
            ? `<tr>
                 <td style="font-weight: 800; background: #f8fafc;">Queixas / Sintomas:</td>
                 <td colspan="3">${formData.sintomas}</td>
               </tr>`
            : ''
        }
        ${
          formData.exercicio
            ? `<tr>
                 <td style="font-weight: 800; background: #f8fafc;">Rotina de Exercícios:</td>
                 <td colspan="3">${formData.exercicio}</td>
               </tr>`
            : ''
        }
        ${
          formData.observacoes
            ? `<tr>
                 <td style="font-weight: 800; background: #f8fafc;">Observações Gerais:</td>
                 <td colspan="3">${formData.observacoes}</td>
               </tr>`
            : ''
        }
      </tbody>
    </table>
  </div>

  <!-- Bloco 2: Composição Corporal & Metas -->
  <div class="page-break-avoid">
    <div class="section-title-wrap">
      <span class="section-number">2</span>
      <h2 class="section-title">Composição Corporal & Metas Nutricionais</h2>
    </div>

    <div class="metrics-grid">
      <div class="metric-box">
        <span class="metric-label">Peso / Altura</span>
        <div class="metric-val">${formData.peso || '--'} kg</div>
        <span class="metric-val-sm">${formData.altura || '--'} cm</span>
      </div>

      <div class="metric-box">
        <span class="metric-label">IMC Corporal</span>
        <div class="metric-val">${imcObj.value}</div>
        <span class="metric-val-sm" style="color: #0284c7;">${imcObj.classification}</span>
      </div>

      <div class="metric-box">
        <span class="metric-label">% Gordura (Siri)</span>
        <div class="metric-val">${formData.percentualGordura ? `${formData.percentualGordura}%` : '--'}</div>
        <span class="metric-val-sm">${formData.classificacaoGordura || 'Jackson & Pollock'}</span>
      </div>

      <div class="metric-box">
        <span class="metric-label">Metas Diárias</span>
        <div class="metric-val">${waterGoalMl.toLocaleString('pt-BR')} ml</div>
        <span class="metric-val-sm" style="color: #d97706;">${formData.calorias ? `${formData.calorias} kcal` : 'Calorias Livres'}</span>
      </div>
    </div>
  </div>

  <!-- Bloco 3: Antropometria Completa (Circunferências e Pregas) -->
  <div class="page-break-avoid">
    <div class="section-title-wrap">
      <span class="section-number">3</span>
      <h2 class="section-title">Avaliação Antropométrica Detalhada</h2>
    </div>

    <!-- Circunferências Corporais Bilaterais -->
    <div style="font-size: 8pt; font-weight: 800; text-transform: uppercase; color: #475569; margin-top: 4px;">
      Circunferências Corporais Bilaterais (cm)
    </div>
    <div class="grid-circunferencias">
      <div class="circ-item">
        <span class="circ-label">Braço D. (Rel / Cont)</span>
        <div class="circ-val">${formData.bracoDireitoRelaxado || formData.braco || '--'} / ${formData.bracoDireitoContraido || '--'} cm</div>
      </div>
      <div class="circ-item">
        <span class="circ-label">Braço E. (Rel / Cont)</span>
        <div class="circ-val">${formData.bracoEsquerdoRelaxado || '--'} / ${formData.bracoEsquerdoContraido || '--'} cm</div>
      </div>
      <div class="circ-item">
        <span class="circ-label">Tórax & Peitoral</span>
        <div class="circ-val">${formData.peitoral || formData.peito || '--'} cm</div>
      </div>
      <div class="circ-item">
        <span class="circ-label">Ombros</span>
        <div class="circ-val">${formData.ombros || '--'} cm</div>
      </div>
      <div class="circ-item">
        <span class="circ-label">Cintura & Abdômen</span>
        <div class="circ-val">${formData.cintura || '--'} / ${formData.abdomen || '--'} cm</div>
      </div>
      <div class="circ-item">
        <span class="circ-label">Quadril</span>
        <div class="circ-val">${formData.quadril || '--'} cm</div>
      </div>
      <div class="circ-item">
        <span class="circ-label">Coxas (D / E)</span>
        <div class="circ-val">${formData.coxaDireita || formData.coxa || '--'} / ${formData.coxaEsquerda || '--'} cm</div>
      </div>
      <div class="circ-item">
        <span class="circ-label">Panturrilhas (D / E)</span>
        <div class="circ-val">${formData.panturrilhaDireita || formData.panturrilha || '--'} / ${formData.panturrilhaEsquerda || '--'} cm</div>
      </div>
    </div>

    <!-- Protocolo de 9 Dobras Cutâneas -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
      <span style="font-size: 8pt; font-weight: 800; text-transform: uppercase; color: #475569;">
        Protocolo de 9 Dobras Cutâneas (mm)
      </span>
      ${somaDobras > 0 ? `<span style="font-size: 8pt; font-weight: 800; background: #f0fdf4; color: #166534; padding: 2px 8px; border-radius: 4px; border: 1px solid #bbf7d0;">Soma Total: ${somaDobras.toFixed(1)} mm</span>` : ''}
    </div>
    <div class="grid-dobras">
      <div class="dobra-box">
        <span class="dobra-label" title="Tríceps">Tríceps</span>
        <div class="dobra-val">${formData.dobraTriceps || '--'}</div>
      </div>
      <div class="dobra-box">
        <span class="dobra-label" title="Subescapular">Subescap.</span>
        <div class="dobra-val">${formData.dobraSubescapular || '--'}</div>
      </div>
      <div class="dobra-box">
        <span class="dobra-label" title="Axilar Média">Axilar M.</span>
        <div class="dobra-val">${formData.dobraAxilarMedia || '--'}</div>
      </div>
      <div class="dobra-box">
        <span class="dobra-label" title="Peitoral">Peitoral</span>
        <div class="dobra-val">${formData.dobraPeitoral || '--'}</div>
      </div>
      <div class="dobra-box">
        <span class="dobra-label" title="Supra-ilíaca">Supra-il.</span>
        <div class="dobra-val">${formData.dobraSuprailiaca || '--'}</div>
      </div>
      <div class="dobra-box">
        <span class="dobra-label" title="Abdominal">Abdom.</span>
        <div class="dobra-val">${formData.dobraAbdominal || '--'}</div>
      </div>
      <div class="dobra-box">
        <span class="dobra-label" title="Coxa">Coxa</span>
        <div class="dobra-val">${formData.dobraCoxa || '--'}</div>
      </div>
      <div class="dobra-box">
        <span class="dobra-label" title="Panturrilha">Panturr.</span>
        <div class="dobra-val">${formData.dobraPanturrilha || '--'}</div>
      </div>
      <div class="dobra-box">
        <span class="dobra-label" title="Bíceps">Bíceps</span>
        <div class="dobra-val">${formData.dobraBiceps || '--'}</div>
      </div>
    </div>
  </div>

  <!-- Bloco 4: Plano Alimentar Detalhado (Texto Fluido sem Corte) -->
  <div class="page-break-avoid">
    <div class="section-title-wrap">
      <span class="section-number">4</span>
      <h2 class="section-title">Plano Alimentar Prescrito</h2>
    </div>

    <div class="editorial-content-box">
${mealPlanText || 'Nenhum plano alimentar detalhado registrado para esta consulta.'}
    </div>
  </div>

  <!-- Bloco 5: Treino, Suplementação & Rastreamento Clínico -->
  ${
    trainingText
      ? `<div class="page-break-avoid">
           <div class="section-title-wrap">
             <span class="section-number">5</span>
             <h2 class="section-title">Prescrição de Exercícios & Treino</h2>
           </div>
           <div class="editorial-content-box sky-theme">
${trainingText}
           </div>
         </div>`
      : ''
  }

  ${
    supplementsText
      ? `<div class="page-break-avoid">
           <div class="section-title-wrap">
             <span class="section-number">6</span>
             <h2 class="section-title">Suplementação & Fitoterapia Estratégica</h2>
           </div>
           <div class="editorial-content-box purple-theme">
${supplementsText}
           </div>
         </div>`
      : ''
  }

  ${
    deficienciasText
      ? `<div class="page-break-avoid">
           <div class="section-title-wrap">
             <span class="section-number">7</span>
             <h2 class="section-title">Rastreamento Clínico & Carências Nutricionais</h2>
           </div>
           <div class="editorial-content-box amber-theme">
${deficienciasText}
           </div>
         </div>`
      : ''
  }

  <!-- Rodapé Editorial Institucional -->
  <div class="document-footer page-break-avoid">
    <div class="confidential-notice">
      Documento confidencial emitido eletronicamente pelo sistema <strong>NutriClinical</strong> para uso exclusivo do paciente <strong>${formData.nome}</strong>. O conteúdo desta prescrição é protegido por sigilo profissional e orientações éticas em nutrição.
    </div>
    <div style="text-align: right;">
      <strong>Dra. Maria Eduarda</strong><br/>
      Nutrição Clínica Funcional & Esportiva
    </div>
  </div>
</body>
</html>`;
}

/**
 * Aciona a exportação / impressão profissional em PDF através de um iframe isolado,
 * garantindo renderização vetorial cristalina, layout rigoroso A4 e sem qualquer elemento de tela.
 */
export function exportClinicalReportPDF(report: ReportRecord): void {
  if (typeof window === 'undefined') return;

  const htmlContent = generateClinicalDocumentHTML(report);

  // Cria um iframe oculto isolado do DOM da aplicação
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    console.error('Falha ao instanciar contexto de impressão do relatório');
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  let hasPrinted = false;
  const triggerPrint = () => {
    if (hasPrinted) return;
    hasPrinted = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Falha na invocação direta do print iframe:', err);
    } finally {
      // Remove o iframe após a ação do usuário
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 60000);
    }
  };

  // Aguarda carregamento de imagens e estilos antes de invocar a impressão
  iframe.onload = () => {
    setTimeout(triggerPrint, 250);
  };

  // Fallback garantido caso iframe.onload não dispare após doc.close()
  setTimeout(triggerPrint, 600);
}
