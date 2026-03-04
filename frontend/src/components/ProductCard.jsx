import { Link } from 'react-router-dom'
import { ExternalLink, RefreshCw, Trash2, TrendingDown, Clock, ToggleLeft, ToggleRight } from 'lucide-react'
import { productsApi } from '../api/client'
import toast from 'react-hot-toast'

const fmt = (price) =>
  price != null
    ? `R$ ${Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : '—'

export default function ProductCard({ product, onRefresh }) {
  const isBelow = product.current_price != null && product.current_price <= product.target_price

  const handleDelete = async () => {
    if (!window.confirm(`Remover "${product.name}" do monitoramento?`)) return
    try {
      await productsApi.delete(product.id)
      toast.success('Produto removido.')
      onRefresh()
    } catch {
      toast.error('Erro ao remover produto.')
    }
  }

  const handleCheckNow = async () => {
    try {
      await productsApi.checkNow(product.id)
      toast.success('Verificação de preço disparada!')
    } catch {
      toast.error('Erro ao disparar verificação.')
    }
  }

  const handleToggle = async () => {
    try {
      await productsApi.update(product.id, { is_active: !product.is_active })
      toast.success(product.is_active ? 'Monitoramento pausado.' : 'Monitoramento retomado.')
      onRefresh()
    } catch {
      toast.error('Erro ao atualizar produto.')
    }
  }

  return (
    <div className={`card hover:shadow-md transition-shadow ${!product.is_active ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-14 h-14 object-contain rounded-lg border border-gray-100 flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <Link
            to={`/products/${product.id}`}
            className="text-sm font-semibold text-gray-900 hover:text-blue-600 line-clamp-2"
          >
            {product.name}
          </Link>
          <p className="text-xs text-gray-400 mt-0.5">{product.retailer}</p>
        </div>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-0.5">Preço Atual</p>
          <p className={`text-base font-bold ${isBelow ? 'text-green-600' : 'text-gray-800'}`}>
            {fmt(product.current_price)}
            {isBelow && <TrendingDown className="inline ml-1" size={14} />}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-0.5">Preço Alvo</p>
          <p className="text-base font-bold text-blue-700">{fmt(product.target_price)}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {!product.is_available && (
          <span className="badge-red">Indisponível</span>
        )}
        {isBelow && product.is_available && (
          <span className="badge-green">🎉 Abaixo do alvo!</span>
        )}
        {product.alert_sent && (
          <span className="badge-yellow">✉ Alerta enviado</span>
        )}
        {!product.is_active && (
          <span className="badge-gray">Pausado</span>
        )}
      </div>

      {/* Last checked */}
      {product.last_checked_at && (
        <p className="text-xs text-gray-400 flex items-center gap-1 mb-4">
          <Clock size={12} />
          Verificado:{' '}
          {new Date(product.last_checked_at).toLocaleString('pt-BR')}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-blue-600 transition-colors"
          title="Ver produto"
        >
          <ExternalLink size={16} />
        </a>
        <button
          onClick={handleCheckNow}
          className="text-gray-400 hover:text-blue-600 transition-colors"
          title="Verificar agora"
        >
          <RefreshCw size={16} />
        </button>
        <button
          onClick={handleToggle}
          className="text-gray-400 hover:text-blue-600 transition-colors"
          title={product.is_active ? 'Pausar monitoramento' : 'Retomar monitoramento'}
        >
          {product.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
        </button>
        <button
          onClick={handleDelete}
          className="text-gray-400 hover:text-red-600 transition-colors ml-auto"
          title="Remover produto"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
