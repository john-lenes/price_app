import { useState } from 'react'
import { productsApi } from '../api/client'
import toast from 'react-hot-toast'
import { Search, X, Plus, Loader } from 'lucide-react'

const fmt = (price) =>
  price != null
    ? `R$ ${Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : 'Preço não disponível'

export default function AddProductModal({ onClose, onAdded }) {
  const [step, setStep] = useState('search') // 'search' | 'confirm'
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [targetPrice, setTargetPrice] = useState('')
  const [interval, setInterval] = useState(30)
  const [saving, setSaving] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      const { data } = await productsApi.search(query.trim())
      setResults(data)
      if (data.length === 0) toast('Nenhum produto encontrado.', { icon: '🔍' })
    } catch {
      toast.error('Erro na busca de produtos.')
    } finally {
      setSearching(false)
    }
  }

  const handleSelect = (product) => {
    setSelected(product)
    setTargetPrice(
      product.current_price ? String(Number(product.current_price).toFixed(2)) : ''
    )
    setStep('confirm')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!selected) return
    const price = parseFloat(targetPrice)
    if (isNaN(price) || price <= 0) {
      toast.error('Informe um preço alvo válido.')
      return
    }
    setSaving(true)
    try {
      await productsApi.create({
        name: selected.name,
        url: selected.url,
        image_url: selected.image_url,
        retailer: selected.retailer,
        target_price: price,
        check_interval_minutes: interval,
      })
      toast.success('Produto adicionado com sucesso!')
      onAdded()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao adicionar produto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'search' ? 'Buscar Produto' : 'Configurar Alerta'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'search' ? (
            <>
              <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                <input
                  type="text"
                  placeholder="Ex: Notebook Dell, iPhone 15…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="input-field flex-1"
                  autoFocus
                />
                <button type="submit" disabled={searching} className="btn-primary flex items-center gap-2 whitespace-nowrap">
                  {searching ? <Loader size={16} className="animate-spin" /> : <Search size={16} />}
                  Buscar
                </button>
              </form>

              {results.length > 0 && (
                <ul className="space-y-3">
                  {results.map((r, i) => (
                    <li
                      key={i}
                      onClick={() => handleSelect(r)}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      {r.image_url && (
                        <img src={r.image_url} alt={r.name} className="w-12 h-12 object-contain rounded" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 line-clamp-2">{r.name}</p>
                        <p className="text-xs text-gray-400">{r.retailer}</p>
                      </div>
                      <div className="text-sm font-bold text-gray-800 whitespace-nowrap">
                        {fmt(r.current_price)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              {selected?.image_url && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <img src={selected.image_url} alt={selected.name} className="w-16 h-16 object-contain rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 line-clamp-2">{selected.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{selected.retailer}</p>
                    {selected.current_price && (
                      <p className="text-sm font-bold text-green-600 mt-1">{fmt(selected.current_price)}</p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Preço Alvo (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="input-field"
                  placeholder="Ex: 1299.90"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">
                  Você receberá um alerta quando o preço cair até este valor ou abaixo.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Intervalo de Verificação (minutos)
                </label>
                <select
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  className="input-field"
                >
                  <option value={15}>A cada 15 min</option>
                  <option value={30}>A cada 30 min</option>
                  <option value={60}>A cada 1 hora</option>
                  <option value={120}>A cada 2 horas</option>
                  <option value={360}>A cada 6 horas</option>
                  <option value={720}>A cada 12 horas</option>
                  <option value={1440}>A cada 24 horas</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep('search')} className="btn-secondary flex-1">
                  ← Voltar
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                  Adicionar Produto
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
