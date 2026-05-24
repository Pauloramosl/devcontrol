import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Button } from '../components/ui/Button.jsx'
import { supabase } from '../lib/supabase.js'

export default function SettingsPage() {
  const { user, updateUserProfile, updatePassword } = useAuth()
  
  // Perfil state
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)

  // Senha state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  
  // Preferências state
  const [compactMode, setCompactMode] = useState(false)
  
  const isEmailProvider = user?.app_metadata?.provider === 'email' || user?.app_metadata?.providers?.includes('email')

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '')
      setAvatarUrl(user.user_metadata?.avatar_url || '')
    }
  }, [user])

  const handleAvatarUpload = async (e) => {
    try {
      setUploadingAvatar(true)
      setProfileMessage('')
      
      const file = e.target.files?.[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setAvatarUrl(data.publicUrl)
    } catch (error) {
      setProfileMessage(`Erro ao fazer upload: ${error.message}`)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMessage('')
    
    const { error } = await updateUserProfile({ fullName, avatarUrl })
    
    setSavingProfile(false)
    if (error) {
      setProfileMessage(`Erro: ${error.message}`)
    } else {
      setProfileMessage('Perfil atualizado com sucesso!')
      setTimeout(() => setProfileMessage(''), 3000)
    }
  }

  const handleSavePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Erro: As senhas não coincidem.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordMessage('Erro: A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setSavingPassword(true)
    setPasswordMessage('')
    
    const { error } = await updatePassword(newPassword)
    
    setSavingPassword(false)
    if (error) {
      setPasswordMessage(`Erro: ${error.message}`)
    } else {
      setPasswordMessage('Senha atualizada com sucesso!')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordMessage(''), 3000)
    }
  }

  return (
    <section className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h2 className="text-dn-h2 text-white">Configurações da Conta</h2>
        <p className="mt-1 text-dn-body text-dn-text-secondary">
          Gerencie seu perfil, preferências e segurança.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          
          {/* PERFIL PÚBLICO */}
          <div className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-xl p-6 shadow-lg relative overflow-hidden">
            <h3 className="text-xl font-bold text-white mb-6">Perfil Público</h3>
            
            {profileMessage && (
              <div className={`p-3 rounded-dn-md text-sm mb-4 border-[0.5px] ${profileMessage.startsWith('Erro') ? 'bg-dn-danger/10 border-dn-danger/30 text-dn-danger' : 'bg-dn-success/10 border-dn-success/30 text-dn-success'}`}>
                {profileMessage}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="shrink-0 flex flex-col items-center gap-3">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-24 h-24 rounded-full bg-dn-bg-elevated border-[0.5px] border-dn-border overflow-hidden flex items-center justify-center text-dn-text-muted transition-all group-hover:border-dn-accent">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      )}
                      
                      {/* Overlay On Hover */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                        {uploadingAvatar ? (
                          <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-6 h-6"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                  <Button type="button" variant="ghost" className="text-xs" disabled={uploadingAvatar} onClick={() => fileInputRef.current?.click()}>
                    {uploadingAvatar ? 'Enviando...' : 'Alterar Foto'}
                  </Button>
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-dn-label text-dn-text-muted mb-2">Nome de Exibição</label>
                    <Input 
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Seu nome completo ou apelido"
                    />
                  </div>
                  {/* Remover o input de URL manual para simplificar a interface conforme solicitado */}
                </div>
              </div>

              <div className="pt-2 border-t-[0.5px] border-white/5 flex justify-end">
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile ? 'Salvando...' : 'Salvar Perfil'}
                </Button>
              </div>
            </form>
          </div>

          {/* SEGURANÇA */}
          {isEmailProvider && (
            <div className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-white mb-6">Segurança</h3>
              
              {passwordMessage && (
                <div className={`p-3 rounded-dn-md text-sm mb-4 border-[0.5px] ${passwordMessage.startsWith('Erro') ? 'bg-dn-danger/10 border-dn-danger/30 text-dn-danger' : 'bg-dn-success/10 border-dn-success/30 text-dn-success'}`}>
                  {passwordMessage}
                </div>
              )}

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-dn-label text-dn-text-muted mb-2">Nova Senha</label>
                    <Input 
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-dn-label text-dn-text-muted mb-2">Confirmar Nova Senha</label>
                    <Input 
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      required
                    />
                  </div>
                </div>
                
                <div className="pt-2 border-t-[0.5px] border-white/5 flex justify-end">
                  <Button type="submit" disabled={savingPassword} variant="primary">
                    {savingPassword ? 'Atualizando...' : 'Atualizar Senha'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {!isEmailProvider && (
             <div className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-xl p-6 shadow-lg">
               <h3 className="text-xl font-bold text-white mb-2">Segurança</h3>
               <p className="text-sm text-dn-text-secondary">Sua conta está vinculada via Google. O gerenciamento de senhas deve ser feito diretamente através do provedor.</p>
             </div>
          )}

        </div>

        {/* SIDEBAR - PREFERÊNCIAS INTELIGENTES */}
        <div className="space-y-6">
          <div className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4">Preferências Locais</h3>
            
            <div className="space-y-6">
              <div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={true}
                      readOnly
                    />
                    <div className="w-10 h-5 bg-dn-accent rounded-full transition-colors relative">
                      <div className="absolute left-[22px] top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm"></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-dn-accent transition-colors">Modo Escuro (Obsidian)</p>
                    <p className="text-xs text-dn-text-secondary mt-1">O tema escuro é obrigatório e está ativado por padrão em todo o sistema.</p>
                  </div>
                </label>
              </div>

              <div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={compactMode}
                      onChange={() => setCompactMode(!compactMode)}
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors relative ${compactMode ? 'bg-dn-accent' : 'bg-dn-bg-elevated border-[0.5px] border-dn-border'}`}>
                      <div className={`absolute top-[3px] w-3.5 h-3.5 bg-white rounded-full transition-all shadow-sm ${compactMode ? 'left-[22px]' : 'left-[3px] bg-dn-text-muted'}`}></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-dn-accent transition-colors">Modo Compacto nas Listas</p>
                    <p className="text-xs text-dn-text-secondary mt-1">Reduz o espaçamento nas tabelas para exibir mais informações (Beta).</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4">Detalhes da Sessão</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b-[0.5px] border-white/5 pb-2">
                <span className="text-dn-text-muted">Provedor</span>
                <span className="text-white capitalize">{user?.app_metadata?.provider || 'Email'}</span>
              </div>
              <div className="flex justify-between border-b-[0.5px] border-white/5 pb-2">
                <span className="text-dn-text-muted">Email Verificado</span>
                <span className="text-dn-success">Sim</span>
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <span className="text-dn-text-muted">Último Login</span>
                <span className="text-white text-xs font-mono">{new Date(user?.last_sign_in_at).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
