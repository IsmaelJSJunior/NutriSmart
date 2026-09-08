import { IMCResult } from '../types';

export function calculateIMC(pesoStr: string, alturaStr: string): IMCResult {
  if (!pesoStr || !alturaStr) {
    return { value: '0.0', classification: 'N/A', colorClass: 'text-gray-500', numericValue: 0 };
  }
  const weight = parseFloat(pesoStr);
  const heightMeters = parseFloat(alturaStr) / 100;
  if (isNaN(weight) || isNaN(heightMeters) || heightMeters <= 0) {
    return { value: '0.0', classification: 'Inválido', colorClass: 'text-gray-500', numericValue: 0 };
  }

  const imc = weight / (heightMeters * heightMeters);
  let classification = '';
  let colorClass = '';

  if (imc < 18.5) {
    classification = 'Abaixo do peso';
    colorClass = 'text-blue-600';
  } else if (imc >= 18.5 && imc <= 24.9) {
    classification = 'Peso normal (Eutrofia)';
    colorClass = 'text-emerald-600';
  } else if (imc >= 25 && imc <= 29.9) {
    classification = 'Sobrepeso';
    colorClass = 'text-amber-600';
  } else if (imc >= 30 && imc <= 34.9) {
    classification = 'Obesidade Grau I';
    colorClass = 'text-orange-600';
  } else if (imc >= 35 && imc <= 39.9) {
    classification = 'Obesidade Grau II';
    colorClass = 'text-red-600';
  } else {
    classification = 'Obesidade Grau III';
    colorClass = 'text-red-800';
  }

  return {
    value: imc.toFixed(1),
    classification,
    colorClass,
    numericValue: parseFloat(imc.toFixed(1)),
  };
}

export function generatePatientCode(existingCodes: string[]): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 100) {
    result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (!existingCodes.includes(result)) {
      isUnique = true;
    }
    attempts++;
  }
  return result || `P${Date.now().toString().slice(-3)}`;
}

export function copyToClipboard(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!text) return resolve(false);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(
        () => resolve(true),
        () => fallbackCopy(text, resolve)
      );
    } else {
      fallbackCopy(text, resolve);
    }
  });
}

function fallbackCopy(text: string, resolve: (val: boolean) => void) {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    resolve(successful);
  } catch (err) {
    console.error('Fallback copy failed:', err);
    resolve(false);
  }
}

export function compressImageForUpload(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = height * (MAX_WIDTH / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(event.target?.result as string);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.onerror = () => reject(new Error('Erro ao carregar imagem para compressão'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

export function exportBackupJSON(
  reports: any[],
  agenda: any[],
  chatMessages: any[],
  recipes?: any[],
  calculatorState?: any,
  pinnedPatients?: string[]
) {
  const data = {
    version: '1.10',
    exportedAt: new Date().toISOString(),
    reports,
    agenda,
    appointments: agenda,
    chatMessages,
    allMessages: chatMessages,
    recipes: recipes || [],
    calculatorState: calculatorState || null,
    pinnedPatients: pinnedPatients || [],
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nutriclinical_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
