import React from 'react';
import { TrendingDown, TrendingUp, LineChart as ChartIcon } from 'lucide-react';

interface ChartPoint {
  date: string;
  [key: string]: any;
}

interface SimpleLineChartProps {
  data: ChartPoint[];
  dataKey: string;
  color: string;
  label: string;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ data, dataKey, color, label }) => {
  const validData = data.filter(
    (d) => d[dataKey] !== undefined && d[dataKey] !== '' && !isNaN(parseFloat(d[dataKey]))
  );

  if (validData.length < 2) {
    return (
      <div className="h-52 flex flex-col items-center justify-center bg-gray-50/70 rounded-2xl border border-gray-100 text-gray-400 text-sm p-5 text-center">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2.5">
          <ChartIcon className="w-5 h-5 text-gray-400" />
        </div>
        <p className="font-semibold text-gray-600">
          Dados insuficientes de <b className="text-gray-800">{label.replace('Evolução ', '')}</b>
        </p>
        <span className="text-xs text-gray-400 mt-1">(São necessárias pelo menos 2 consultas)</span>
      </div>
    );
  }

  const width = 340;
  const height = 160;
  const paddingX = 40;
  const paddingTop = 25;
  const paddingBottom = 25;

  const values = validData.map((d) => parseFloat(d[dataKey]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min === 0 ? 1 : max - min;

  const points = validData.map((d, i) => {
    const val = parseFloat(d[dataKey]);
    const x = paddingX + (i * (width - 2 * paddingX)) / (validData.length - 1);
    const y = height - paddingBottom - ((val - min) / range) * (height - paddingTop - paddingBottom);
    return { x, y, val, date: d.date };
  });

  const pointsString = points.map((p) => `${p.x},${p.y}`).join(' ');

  const isDecreasing = values[values.length - 1] < values[0];
  const isWeightOrPerimeter = ['peso', 'imc', 'abdomen', 'cintura', 'quadril'].includes(dataKey);
  const isPositive = isWeightOrPerimeter ? isDecreasing : !isDecreasing;
  const latestValue = values[values.length - 1];
  const unit = dataKey === 'peso' ? 'kg' : dataKey === 'imc' ? '' : 'cm';

  return (
    <div className="bg-white/95 backdrop-blur p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="font-bold text-gray-800 text-sm">{label}</h4>
          <p className="text-[11px] text-gray-400 font-medium mt-0.5">
            {validData.length} registros no prontuário
          </p>
        </div>
        <div
          className={`flex items-center text-xs font-black px-2.5 py-1 rounded-lg border ${
            isPositive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {isDecreasing ? (
            <TrendingDown className="w-3.5 h-3.5 mr-1" />
          ) : (
            <TrendingUp className="w-3.5 h-3.5 mr-1" />
          )}
          <span>
            {latestValue} {unit}
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area fill under curve */}
          <polygon
            points={`${paddingX},${height - paddingBottom} ${pointsString} ${width - paddingX},${height - paddingBottom}`}
            fill={`url(#gradient-${dataKey})`}
          />

          {/* Background gridlines */}
          <line
            x1={paddingX}
            y1={paddingTop}
            x2={width - paddingX}
            y2={paddingTop}
            stroke="#f1f5f9"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height - paddingBottom}
            x2={width - paddingX}
            y2={height - paddingBottom}
            stroke="#e2e8f0"
          />

          {/* Main polyline */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsString}
          />

          {/* Value circles & labels */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="white" stroke={color} strokeWidth="2.5" />
              <text
                x={p.x}
                y={p.y - 10}
                fontSize="10"
                fill="#334155"
                textAnchor="middle"
                fontWeight="800"
              >
                {p.val}
                {unit}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-2 font-semibold uppercase tracking-wider">
        <span>
          {new Date(validData[0].date).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'short',
          })}
        </span>
        <span>
          {new Date(validData[validData.length - 1].date).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'short',
          })}
        </span>
      </div>
    </div>
  );
};
