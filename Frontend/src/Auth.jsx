import { useState } from 'react'
import './Auth.css'

export default function Auth({ onLogin, theme, toggleTheme }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    rememberMe: true,
  })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (mode === 'signup') {
      if (!formData.name.trim()) {
        newErrors.name = 'يرجى إدخال الاسم الكامل'
      } else if (formData.name.trim().length < 3) {
        newErrors.name = 'يجب أن يكون الاسم 3 أحرف على الأقل'
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'يرجى إدخال البريد الإلكتروني'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'يرجى إدخال بريد إلكتروني صالح'
    }

    if (!formData.password) {
      newErrors.password = 'يرجى إدخال كلمة المرور'
    } else if (formData.password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 خانات على الأقل'
    }

    if (mode === 'signup') {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'يرجى تأكيد كلمة المرور'
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'كلمتا المرور غير متطابقتين'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      const user = {
        name: mode === 'signup' ? formData.name.trim() : (formData.name.trim() || 'أحمد كمال'),
        email: formData.email.trim(),
      }
      onLogin(user)
    }, 600)
  }

  const handleDemoLogin = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      onLogin({
        name: 'أحمد كمال',
        email: 'ahmed@sehatek.ai',
      })
    }, 400)
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setErrors({})
  }

  return (
    <div className={`auth-page ${theme}`}>
      {/* Background Decorative Ambient Blobs */}
      <div className="auth-ambient-glow auth-glow-1" aria-hidden="true" />
      <div className="auth-ambient-glow auth-glow-2" aria-hidden="true" />

      {/* Top Header Bar for Theme Toggle & Logo */}
      <header className="auth-header">
        <div className="auth-header-logo">
          <img src="/logo.png" alt="صحتك" className="auth-logo-img" />
          <span className="auth-logo-badge">الذكاء الاصطناعي الطبي</span>
        </div>

        <button
          className="auth-theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
          aria-label="تبديل المظهر"
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sun-icon">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="moon-icon">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </header>

      {/* Main Authentication Split Container */}
      <main className="auth-container">
        {/* Left/Right Interactive Form Card */}
        <div className="auth-card">
          {/* Mode Switcher Tabs */}
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
              role="tab"
              aria-selected={mode === 'login'}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => switchMode('signup')}
              role="tab"
              aria-selected={mode === 'signup'}
            >
              إنشاء حساب جديد
            </button>
          </div>

          <div className="auth-card-header">
            <h2>{mode === 'login' ? 'مرحباً بعودتك إلى صحتك 👋' : 'ابدأ رحلتك الصحية معنا 🩺'}</h2>
            <p>
              {mode === 'login'
                ? 'سجّل دخولك للوصول إلى استشاراتك الطبية الذكية وسجل محادثاتك'
                : 'أنشئ حسابك المجاني واستمتع برعاية صحية استرشادية على مدار الساعة'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {/* Full Name field (Only in Sign Up) */}
            {mode === 'signup' && (
              <div className="form-group">
                <label htmlFor="auth-name">الاسم الكامل</label>
                <div className={`input-field-wrapper ${errors.name ? 'error' : ''}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="field-icon">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    id="auth-name"
                    type="text"
                    placeholder="مثال: أحمد كمال"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    autoComplete="name"
                  />
                </div>
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>
            )}

            {/* Email field */}
            <div className="form-group">
              <label htmlFor="auth-email">البريد الإلكتروني</label>
              <div className={`input-field-wrapper ${errors.email ? 'error' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="field-icon">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <input
                  id="auth-email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  autoComplete="email"
                  dir="ltr"
                />
              </div>
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            {/* Password field */}
            <div className="form-group">
              <label htmlFor="auth-password">كلمة المرور</label>
              <div className={`input-field-wrapper ${errors.password ? 'error' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="field-icon">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  dir="ltr"
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            {/* Confirm Password field (Only in Sign Up) */}
            {mode === 'signup' && (
              <div className="form-group">
                <label htmlFor="auth-confirm-password">تأكيد كلمة المرور</label>
                <div className={`input-field-wrapper ${errors.confirmPassword ? 'error' : ''}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="field-icon">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    autoComplete="new-password"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="eye-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showConfirmPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              </div>
            )}

            {/* Remember Me & Forgot Password (Login mode) */}
            {mode === 'login' && (
              <div className="form-extra-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
                  />
                  <span>تذكرني على هذا الجهاز</span>
                </label>
                <a href="#forgot" className="forgot-link" onClick={(e) => { e.preventDefault(); alert('يمكنك استخدام الحساب التجريبي للدخول الفوري'); }}>
                  نسيت كلمة المرور؟
                </a>
              </div>
            )}

            {/* Primary Submit Button */}
            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? (
                <div className="auth-spinner"></div>
              ) : (
                <span>{mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب والمتابعة'}</span>
              )}
            </button>

            {/* Quick Demo Access Button */}
            <button type="button" className="demo-login-btn" onClick={handleDemoLogin} disabled={isLoading}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="demo-icon">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span>دخول سريع بحساب تجريبي</span>
            </button>
          </form>

          {/* Footer Switcher Link */}
          <div className="auth-card-footer">
            {mode === 'login' ? (
              <p>
                ليس لديك حساب؟{' '}
                <button type="button" className="switch-link-btn" onClick={() => switchMode('signup')}>
                  إنشاء حساب جديد
                </button>
              </p>
            ) : (
              <p>
                لديك حساب بالفعل؟{' '}
                <button type="button" className="switch-link-btn" onClick={() => switchMode('login')}>
                  تسجيل الدخول
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Right Feature Showcase Banner (Desktop & Tablet) */}
        <div className="auth-showcase">
          <div className="showcase-content">
            <div className="showcase-badge">
              <img src="/ai-avatar.png" alt="AI" className="showcase-avatar-icon" />
              <span className="pulse-dot-green"></span>
              <span>الجيل الجديد من الرعاية الصحية الذكية</span>
            </div>

            <h1 className="showcase-title">
              استشر رفيقك الصحي <br />
              <span className="gradient-text">بكل ثقة وسرعة</span>
            </h1>

            <p className="showcase-desc">
              نظام محادثة طبي ذكي يحلل أعراضك بدقة ويقدم لك إرشادات استرشادية مبنية على أحدث المعايير الطبية الموثوقة.
            </p>

            <div className="showcase-features">
              <div className="feature-item">
                <div className="feature-icon">⚡</div>
                <div>
                  <h4>استجابة فورية 24/7</h4>
                  <p>إجابات دقيقة وتوجيهات صحية في ثوانٍ معدودة</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">🔒</div>
                <div>
                  <h4>خصوصية وأمان تام</h4>
                  <p>تشفير كامل لبياناتك ومحادثاتك الصحية</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">🧠</div>
                <div>
                  <h4>تحليل ذكي للأعراض</h4>
                  <p>فهم دقيق للشكاوى وتقديم خيارات الرعاية المناسبة</p>
                </div>
              </div>
            </div>

            {/* Testimonial Quote */}
            <div className="showcase-quote">
              <p>&quot;صحتك وفر لي راحة بال حقيقية عندما شعرت بأعراض مفاجئة، ووجهني للخطوة الصحيحة فوراً.&quot;</p>
              <span className="quote-author">— د. سارة محمود، استشارية طب أسرة</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
