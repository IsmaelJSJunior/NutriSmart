import React from 'react';

interface BackgroundDecorationProps {
  bgImage?: string;
}

export const BackgroundDecoration: React.FC<BackgroundDecorationProps> = ({
  bgImage = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=2000',
}) => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden print:hidden bg-slate-50 w-full h-full">
      {/* Organic Wellness Texture Overlay */}
      <div
        className="absolute inset-0 z-0 opacity-10 bg-cover bg-center transition-opacity duration-1000 ease-in-out w-full h-full"
        style={{
          backgroundImage: `url('${bgImage}')`,
        }}
      />

      {/* Sleek Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-slate-50/90 to-emerald-50/95 z-0" />
    </div>
  );
};

