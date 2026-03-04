import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { TrendingDown, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Register() {
  const { register, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone_whatsapp: '',
    notify_email: true,
    notify_whatsapp: false,
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    setLoading(true)
    try {
      await register(form)
      await login(form.email, form.password)
      toast.success('Conta criada com sucesso!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <TrendingDown className="text-blue-600" size={32} />
          <h1 className="text-2xl font-bold text-gray-900">Price Monitor</h1>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">Criar conta gratuita</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              className="input-field"
              placeholder="Seu Nome"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="input-field"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="input-field"
              placeholder="Mínimo 8 caracteres"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              WhatsApp (opcional)
            </label>
            <input
              type="tel"
              name="phone_whatsapp"
              value={form.phone_whatsapp}
              onChange={handleChange}
              className="input-field"
              placeholder="+55 11 99999-9999"
            />
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-sm font-medium text-gray-700">Notificações</p>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                name="notify_email"
                checked={form.notify_email}
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600"
              />
              Alertas por e-mail
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                name="notify_whatsapp"
                checked={form.notify_whatsapp}
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600"
              />
              Alertas por WhatsApp
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2"
          >
            {loading && <Loader size={16} className="animate-spin" />}
            Criar Conta
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
