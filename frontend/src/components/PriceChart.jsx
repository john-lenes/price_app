import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const formatBRL = (value) =>
  `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="text-gray-500 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {formatBRL(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function PriceChart({ history, targetPrice }) {
  if (!history || history.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Nenhum histórico disponível ainda.
      </div>
    )
  }

  const data = history.map((h) => ({
    date: format(new Date(h.checked_at), 'dd/MM HH:mm', { locale: ptBR }),
    Preço: Number(h.price),
    available: h.is_available,
  }))

  const prices = data.map((d) => d['Preço'])
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const yMin = Math.floor(minPrice * 0.97)
  const yMax = Math.ceil(Math.max(maxPrice, Number(targetPrice)) * 1.03)

  // Only show every N-th label to avoid crowding
  const tickInterval = Math.max(1, Math.floor(data.length / 8))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          interval={tickInterval - 1}
          tickLine={false}
        />
        <YAxis
          domain={[yMin, yMax]}
          tickFormatter={formatBRL}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          width={90}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {targetPrice && (
          <ReferenceLine
            y={Number(targetPrice)}
            stroke="#3b82f6"
            strokeDasharray="6 3"
            label={{
              value: `Alvo: ${formatBRL(targetPrice)}`,
              fill: '#3b82f6',
              fontSize: 11,
              position: 'insideTopRight',
            }}
          />
        )}
        <Line
          type="monotone"
          dataKey="Preço"
          stroke="#10b981"
          strokeWidth={2}
          dot={data.length <= 50 ? { r: 3, fill: '#10b981' } : false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
