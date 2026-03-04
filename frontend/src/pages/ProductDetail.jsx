import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { productsApi, priceHistoryApi, alertsApi } from '../api/client'
import PriceChart from '../components/PriceChart'
import { ArrowLeft, ExternalLink, RefreshCw, Trash2, Edit2, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const fmt = (price) =>
  price != null
    ? `R$ ${Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : '—'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [history, setHistory] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState(false)
  const [newTarget, setNewTarget] = useState('')

  const fetchAll = useCallback(async () => {
    try {
      const [{ data: p }, { data: h }, { data: a }] = await Promise.all([
        productsApi.get(id),
        priceHistoryApi.get(id),
        alertsApi.list(id),
      ])
      setProduct(p)
      setHistory(h)
      setAlerts(a)
      setNewTarget(String(p.target_price))
    } catch {
      toast.error('Erro ao carregar produto.')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleDelete = async () => {
    if (!window.confirm('Remover este produto?')) return
    await productsApi.delete(id)
    toast.success('Produto removido.')
    navigate('/')
  }

  const handleCheckNow = async () => {
    await productsApi.checkNow(id)
    toast.success('Verificação disparada!')
  }

  const handleSaveTarget = async () => {
    const price = parseFloat(newTarget)
    if (isNaN(price) || price <= 0) {
      toast.error('Preço inválido.')
      return
    }
    try {
      const { data } = await productsApi.update(id, { target_price: price })
      setProduct(data)
      setEditTarget(false)
      toast.success('Preço alvo atualizado.')
    } catch {
      toast.error('Erro ao atualizar.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }
  if (!product) return null

  const isBelow = product.current_price != null && product.current_price <= product.target_price

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Back */}
      <Link to="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft size={16} /> Voltar ao painel
      </Link>

      {/* Product header */}
      <div className="card mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-20 h-20 object-contain rounded-xl border border-gray-100"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 mb-1">{product.name}</h1>
            <p className="text-sm text-gray-400 mb-3">{product.retailer}</p>

            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-gray-500">Preço Atual</p>
                <p className={`text-2xl font-bold ${isBelow ? 'text-green-600' : 'text-gray-800'}`}>
                  {fmt(product.current_price)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Preço Alvo</p>
                {editTarget ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newTarget}
                      onChange={(e) => setNewTarget(e.target.value)}
                      className="input-field w-32 text-sm"
                      autoFocus
                    />
                    <button onClick={handleSaveTarget} className="text-green-600 hover:text-green-700">
                      <Check size={18} />
                    </button>
                    <button onClick={() => setEditTarget(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-blue-700">{fmt(product.target_price)}</p>
                    <button
                      onClick={() => setEditTarget(true)}
                      className="text-gray-400 hover:text-blue-600"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Menor Preço</p>
                <p className="text-xl font-bold text-emerald-600">{fmt(product.lowest_price)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Maior Preço</p>
                <p className="text-xl font-bold text-gray-600">{fmt(product.highest_price)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-5 pt-5 border-t border-gray-100">
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <ExternalLink size={15} /> Ver no site
          </a>
          <button onClick={handleCheckNow} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={15} /> Verificar agora
          </button>
          <button
            onClick={handleDelete}
            className="btn-danger flex items-center gap-2 text-sm ml-auto"
          >
            <Trash2 size={15} /> Remover
          </button>
        </div>
      </div>

      {/* Price Chart */}
      <div className="card mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Histórico de Preços</h2>
        <PriceChart history={history} targetPrice={product.target_price} />
        <p className="text-xs text-gray-400 mt-2 text-right">{history.length} registros</p>
      </div>

      {/* Alerts log */}
      {alerts.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Histórico de Alertas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100 text-xs">
                  <th className="pb-2 pr-4">Data</th>
                  <th className="pb-2 pr-4">Preço Acionado</th>
                  <th className="pb-2 pr-4">Preço Alvo</th>
                  <th className="pb-2">Canal</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-500">
                      {format(new Date(a.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </td>
                    <td className="py-2 pr-4 font-semibold text-green-600">{fmt(a.triggered_price)}</td>
                    <td className="py-2 pr-4 text-blue-600">{fmt(a.target_price)}</td>
                    <td className="py-2">
                      <span className="badge-gray capitalize">{a.notification_type}</span>
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
