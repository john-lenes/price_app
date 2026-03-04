import { useState, useEffect } from 'react'
import { alertsApi } from '../api/client'
import { Bell } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

const fmt = (price) =>
  price != null
    ? `R$ ${Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : '—'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    alertsApi
      .list()
      .then(({ data }) => setAlerts(data))
      .catch(() => toast.error('Erro ao carregar alertas.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Bell className="text-blue-600" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Alertas</h1>
          <p className="text-sm text-gray-500 mt-1">Todos os alertas de queda de preço enviados.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-24">
          <Bell className="mx-auto text-gray-300 mb-4" size={56} />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum alerta enviado ainda</h3>
          <p className="text-gray-400 text-sm">
            Quando um produto atingir seu preço alvo, os alertas aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-gray-500 text-xs">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Preço Acionado</th>
                  <th className="py-3 px-4">Preço Alvo</th>
                  <th className="py-3 px-4">Canal</th>
                  <th className="py-3 px-4">Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                      {format(new Date(a.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-green-600 whitespace-nowrap">
                      {fmt(a.triggered_price)}
                    </td>
                    <td className="py-3 px-4 text-blue-600 whitespace-nowrap">
                      {fmt(a.target_price)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="badge-gray capitalize">{a.notification_type}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {a.message || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
