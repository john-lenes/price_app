import { useState, useEffect, useCallback } from 'react'
import { productsApi } from '../api/client'
import ProductCard from '../components/ProductCard'
import AddProductModal from '../components/AddProductModal'
import { Plus, Search, Package, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('')

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await productsApi.list()
      setProducts(data)
    } catch {
      toast.error('Erro ao carregar produtos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
    // Poll every 60 seconds to refresh prices
    const interval = setInterval(fetchProducts, 60_000)
    return () => clearInterval(interval)
  }, [fetchProducts])

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    p.retailer.toLowerCase().includes(filter.toLowerCase())
  )

  const stats = {
    total: products.length,
    belowTarget: products.filter((p) => p.current_price != null && p.current_price <= p.target_price).length,
    unavailable: products.filter((p) => !p.is_available).length,
    active: products.filter((p) => p.is_active).length,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel de Monitoramento</h1>
          <p className="text-gray-500 text-sm mt-1">Acompanhe os preços dos seus produtos em tempo real.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Adicionar Produto
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Monitorados', value: stats.total, icon: Package, color: 'text-blue-600' },
          { label: 'Ativos', value: stats.active, icon: TrendingDown, color: 'text-green-600' },
          { label: 'Abaixo do Alvo', value: stats.belowTarget, icon: TrendingDown, color: 'text-emerald-600' },
          { label: 'Indisponíveis', value: stats.unavailable, icon: Package, color: 'text-red-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <Icon className={color} size={24} />
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      {products.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Filtrar produtos…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field pl-9"
          />
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24">
          <Package className="mx-auto text-gray-300 mb-4" size={56} />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum produto monitorado</h3>
          <p className="text-gray-400 text-sm mb-6">
            Clique em "Adicionar Produto" para começar a monitorar preços.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            + Adicionar Produto
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          Nenhum produto encontrado para "{filter}".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} onRefresh={fetchProducts} />
          ))}
        </div>
      )}

      {showModal && (
        <AddProductModal onClose={() => setShowModal(false)} onAdded={fetchProducts} />
      )}
    </div>
  )
}
