import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { TrendingDown, Bell, User, LogOut, Home } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) =>
    location.pathname === path
      ? 'text-blue-600 font-semibold'
      : 'text-gray-600 hover:text-gray-900'

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <TrendingDown className="text-blue-600" size={24} />
            <span className="text-lg font-bold text-gray-900">Price Monitor</span>
          </Link>

          {/* Navigation links */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/" className={`flex items-center gap-1.5 ${isActive('/')}`}>
              <Home size={16} /> Dashboard
            </Link>
            <Link to="/alerts" className={`flex items-center gap-1.5 ${isActive('/alerts')}`}>
              <Bell size={16} /> Alertas
            </Link>
            <Link to="/profile" className={`flex items-center gap-1.5 ${isActive('/profile')}`}>
              <User size={16} /> Perfil
            </Link>
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-gray-500 truncate max-w-[180px]">
              {user?.full_name}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600 transition-colors"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
