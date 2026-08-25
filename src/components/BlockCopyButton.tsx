import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../lib/utils';

interface BlockCopyButtonProps {
  title: string;
  content: string;
  className?: string;
}

export const BlockCopyButton: React.FC<BlockCopyButtonProps> = ({ title, content, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const textToCopy = `*${title.toUpperCase()}*\n\n${content.trim()}`;
    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all duration-150 active:scale-95 ${
        copied
          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
          : 'bg-white/90 text-gray-600 border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
      } ${className}`}
      title="Copiar este bloco"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-white" />
          <span>Copiado!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>Copiar</span>
        </>
      )}
    </button>
  );
};
