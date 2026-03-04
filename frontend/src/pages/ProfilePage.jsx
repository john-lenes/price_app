import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usersApi } from '../api/client'
import { User, Loader, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone_whatsapp: user?.phone_whatsapp || '',
    notify_email: user?.notify_email ?? true,
    notify_whatsapp: user?.notify_whatsapp ?? false,
    password: '',
    password_confirm: '',
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password && form.password !== form.password_confirm) {
      toast.error('As senhas não coincidem.')
      return
    }
    setSaving(true)
    const payload = {
      full_name: form.full_name,
      phone_whatsapp: form.phone_whatsapp || null,
      notify_email: form.notify_email,
      notify_whatsapp: form.notify_whatsapp,
    }
    if (form.password) payload.password = form.password

    try {
      const { data } = await usersApi.updateMe(payload)
      updateUser(data)
      toast.success('Perfil atualizado com sucesso.')
      setForm((f) => ({ ...f, password: '', password_confirm: '' }))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao atualizar perfil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <User className="text-blue-600" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              WhatsApp
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

          <div className="space-y-2">
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

          <hr className="border-gray-100" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nova Senha <span className="text-gray-400 font-normal">(deixe em branco para não alterar)</span>
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="input-field"
              placeholder="Mínimo 8 caracteres"
              minLength={form.password ? 8 : undefined}
            />
          </div>

          {form.password && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar Nova Senha</label>
              <input
                type="password"
                name="password_confirm"
                value={form.password_confirm}
                onChange={handleChange}
                className="input-field"
                placeholder="Repita a senha"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 w-full justify-center py-2.5"
          >
            {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar Alterações
          </button>
        </form>
      </div>
    </div>
  )
}
