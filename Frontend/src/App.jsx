import { useState, useRef, useEffect } from 'react'
import Auth from './Auth'
import './App.css'

const INITIAL_HISTORY = [
  { id: 1, title: 'وجع في البطن و صداع' },
  { id: 2, title: 'حاسس بوجع في القولون' },
  { id: 3, title: 'مليش نفس آكل' },
  { id: 4, title: 'استشارة بخصوص ضغط الدم' },
]

const SAMPLE_CONVERSATIONS = {
  1: [
    {
      id: 'm1',
      sender: 'bot',
      title: 'أهلاً، أنا موجود هنا لخدمتك',
      text: 'لو سمحت قولي حاسس بإيه النهاردة؟',
      time: '10:30 ص',
    },
    {
      id: 'm2',
      sender: 'user',
      text: 'حاسس بصداع وفقدان للتوازن ووجع في القولون',
      time: '10:31 ص',
    },
    {
      id: 'm3',
      sender: 'bot',
      title: 'تحليل الأعراض الأولية',
      text: 'سلامتك أولاً. الصداع المصحوب بعدم الاتزان واضطرابات القولون قد يكون ناتجاً عن إجهاد عصبي، أو جفاف، أو تهيج في الجهاز الهضمي. هل تناولت كمية كافية من الماء اليوم؟ وهل يوجد غثيان أو ارتفاع في درجة الحرارة؟',
      time: '10:32 ص',
    },
  ],
  2: [
    {
      id: 'm1',
      sender: 'bot',
      title: 'أهلاً بك في صحتك',
      text: 'كيف يمكنني مساعدتك اليوم؟',
      time: '09:15 ص',
    },
    {
      id: 'm2',
      sender: 'user',
      text: 'حاسس بوجع في القولون وانتفاخ مستمر بعد الوجبات',
      time: '09:16 ص',
    },
    {
      id: 'm3',
      sender: 'bot',
      title: 'إرشادات الجهاز الهضمي',
      text: 'ينصح بالابتعاد عن البقوليات والمشروبات الغازية حالياً، وشرب شاي النعناع أو الينسون الدافئ. إذا استمر الألم ينصح باستشارة أخصائي باطنة.',
      time: '09:18 ص',
    },
  ],
}

const QUICK_PROMPTS = [
  '🩺 حاسس بصداع شديد وإرهاق',
  '💊 أعراض تهيج القولون العصبي',
  '🍏 نصائح لتهدئة آلام المعدة',
  '💧 كيفية الوقاية من الجفاف',
]

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('sehatek_user')
      if (savedUser) {
        try {
          return JSON.parse(savedUser)
        } catch {
          return null
        }
      }
    }
    return null
  })

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth > 900 : true
  })
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  const [activeChatId, setActiveChatId] = useState(1)
  const [messages, setMessages] = useState(SAMPLE_CONVERSATIONS[1] || [])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isRecentFlyoutOpen, setIsRecentFlyoutOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const handleLogin = (user) => {
    setCurrentUser(user)
    localStorage.setItem('sehatek_user', JSON.stringify(user))
  }

  const handleLogout = () => {
    if (window.confirm('هل تريد تسجيل الخروج والعودة لصفحة الدخول؟')) {
      setCurrentUser(null)
      localStorage.removeItem('sehatek_user')
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchOpen])

  // Keyboard shortcut Ctrl+K for search and Esc to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false)
        setIsRecentFlyoutOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelectChat = (id) => {
    setActiveChatId(id)
    setMessages(SAMPLE_CONVERSATIONS[id] || [
      {
        id: 'init',
        sender: 'bot',
        title: 'أهلاً، أنا موجود هنا لخدمتك',
        text: 'كيف يمكنني مساعدتك في هذه المحادثة؟',
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setIsSearchOpen(false)
    setIsRecentFlyoutOpen(false)
    if (window.innerWidth <= 900) {
      setIsSidebarOpen(false)
    }
  }

  const handleNewChat = () => {
    const newId = Date.now()
    setActiveChatId(newId)
    setMessages([
      {
        id: 'new_init',
        sender: 'bot',
        title: 'محادثة صحية جديدة',
        text: 'أهلاً بك! تفضل بوصف الأعراض التي تشعر بها أو اسأل أي سؤال طبي استرشادي.',
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setIsRecentFlyoutOpen(false)
    if (window.innerWidth <= 900) {
      setIsSidebarOpen(false)
    }
  }

  const handleSend = (textToSend = inputText) => {
    const text = textToSend.trim()
    if (!text || isTyping) return

    const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      time: now,
    }

    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setIsTyping(true)

    // ChatGPT-style waiting time with 3 dots loading (1.2s delay)
    setTimeout(() => {
      setIsTyping(false)
      
      const fullResponse = `شكراً لمشاركتك هذه الأعراض. بناءً على وصفك لـ "${text}"، نوصي بأخذ قسط من الراحة وشرب كميات كافية من الماء والسوائل الدافئة. إذا استمرت الأعراض أو شعرت بأي تفاقم، يُرجى استشارة الطبيب المختص أو التوجه لأقرب مركز صحي فوراً.`
      const botMsgId = `bot-${Date.now()}`
      const botTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })

      const initialBotMsg = {
        id: botMsgId,
        sender: 'bot',
        title: 'استجابة المساعد الطبي',
        text: '',
        time: botTime,
      }

      setMessages((prev) => [...prev, initialBotMsg])

      const words = fullResponse.split(' ')
      let currentWordIndex = 0

      const streamInterval = setInterval(() => {
        currentWordIndex++
        const currentText = words.slice(0, currentWordIndex).join(' ')

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId ? { ...msg, text: currentText } : msg
          )
        )

        if (currentWordIndex >= words.length) {
          clearInterval(streamInterval)
        }
      }, 35)
    }, 1200)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const filteredHistory = INITIAL_HISTORY.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const userInitials = currentUser?.name
    ? currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2)
    : 'AK'

  // If user is not logged in, render the Auth page
  if (!currentUser) {
    return <Auth onLogin={handleLogin} theme={theme} toggleTheme={toggleTheme} />
  }

  return (
    <div className={`app ${theme}`}>
      <div className="container">
        {/* Right Sidebar */}
        <aside className={`sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
          {/* ====================================================
              Collapsed Rail Options (ChatGPT Style: Toggle, New Chat, Search, Recent)
          ==================================================== */}
          <div className="collapsed-rail-items">
            {/* 1. Sidebar Toggle / Dock Icon */}
            <button
              className="rail-icon-btn"
              onClick={() => setIsSidebarOpen(true)}
              title="فتح القائمة الجانبية"
              aria-label="فتح القائمة الجانبية"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="4" />
                <path d="M9 3v18" />
              </svg>
            </button>

            {/* 2. New Chat Icon (Pen in Box) */}
            <button
              className="rail-icon-btn"
              onClick={handleNewChat}
              title="محادثة جديدة"
              aria-label="محادثة جديدة"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
              </svg>
            </button>

            {/* 3. Search Icon (Magnifying Glass) */}
            <button
              className="rail-icon-btn"
              onClick={() => setIsSearchOpen(true)}
              title="بحث في المحادثات"
              aria-label="بحث في المحادثات"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            </button>

            {/* 4. Recent Chats Icon (Speech Bubble) */}
            <button
              className={`rail-icon-btn ${isRecentFlyoutOpen ? 'active' : ''}`}
              onClick={() => setIsRecentFlyoutOpen(!isRecentFlyoutOpen)}
              title="المحادثات الأخيرة"
              aria-label="المحادثات الأخيرة"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
              </svg>
            </button>

            {/* Collapsed Rail Bottom Actions */}
            <div className="rail-bottom-items">
              <div className="rail-avatar" onClick={handleLogout} title={`${currentUser.name} (انقر لتسجيل الخروج)`}>
                {userInitials}
              </div>
            </div>

            {/* Recent Chats Popover in Collapsed State */}
            {isRecentFlyoutOpen && !isSidebarOpen && (
              <div className="recent-flyout-menu">
                <div className="recent-flyout-header">
                  <span>المحادثات الأخيرة</span>
                  <button className="close-mini-btn" onClick={() => setIsRecentFlyoutOpen(false)}>×</button>
                </div>
                <div className="recent-flyout-list">
                  {INITIAL_HISTORY.map((item) => (
                    <div
                      key={item.id}
                      className={`recent-flyout-item ${activeChatId === item.id ? 'active' : ''}`}
                      onClick={() => handleSelectChat(item.id)}
                    >
                      <span className="history-dot"></span>
                      <span className="recent-flyout-title">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ====================================================
              Full Expanded Sidebar Content
          ==================================================== */}
          <div className="sidebar-expanded-content">
            <div className="sidebar-header">
              <div className="logo">
                <img src="/logo.png" alt="صحتك" className="logo-img" />
              </div>
              <button
                className="collapse-btn"
                onClick={() => setIsSidebarOpen(false)}
                title="إغلاق القائمة"
                aria-label="إغلاق القائمة"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="4" />
                  <path d="M9 3v18" />
                </svg>
              </button>
            </div>

            <div className="sidebar-action-row">
              <button className="new-chat-btn" onClick={handleNewChat}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
                  <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
                </svg>
                <span>محادثة جديدة</span>
              </button>
              <button
                className="search-shortcut-btn"
                onClick={() => setIsSearchOpen(true)}
                title="بحث (Ctrl+K)"
                aria-label="بحث في المحادثات"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
              </button>
            </div>

            <div className="chat-history">
              <div className="history-header-row">
                <h3 className="history-title">تاريخ المحادثات</h3>
                <span className="history-count">{INITIAL_HISTORY.length}</span>
              </div>
              <div className="history-list">
                {INITIAL_HISTORY.map((item) => (
                  <div
                    key={item.id}
                    className={`history-item ${activeChatId === item.id ? 'active' : ''}`}
                    onClick={() => handleSelectChat(item.id)}
                  >
                    <span className="history-dot"></span>
                    <span className="history-item-text">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bottom-section">
              <div className="emergency-card">
                <div className="emergency-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.5a16 16 0 0 0 6 6l.89-.89a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z" />
                  </svg>
                </div>
                <div className="emergency-content">
                  <h4>طوارئ؟</h4>
                  <p>ابحث عن رعاية فورية</p>
                </div>
                <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </div>

              {/* Profile Card with Logout capability */}
              <div className="profile-card" onClick={handleLogout} title="انقر لتسجيل الخروج">
                <div className="avatar">{userInitials}</div>
                <div className="profile-info">
                  <h4>{currentUser.name}</h4>
                  <span className="logout-badge">تسجيل الخروج ⎋</span>
                </div>
                <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </div>
            </div>
          </div>
        </aside>

        {/* Chat Area */}
        <main className="chat-area">
          {/* Top Header */}
          <header className="chat-header">
            <div className="chat-header-center">
              <div className="header-avatar-wrap">
                <img src="/ai-avatar.png" alt="المساعد الذكي" className="header-avatar-img" />
                <div className="status-dot"></div>
              </div>
              <div className="chat-header-titles">
                <h2>المساعد الصحي الذكي</h2>
                <span className="online-status">جاهز للمساعدة</span>
              </div>
            </div>

            <div className="header-actions-left">
              {/* Only Theme Toggle Button in Header */}
              <button
                className="theme-toggle-btn"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
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
            </div>
          </header>

          {/* Messages Stream */}
          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className="message-group">
                {msg.sender === 'bot' ? (
                  <div className="bot-message">
                    <div className="bot-avatar">
                      <img src="/ai-avatar.png" alt="المساعد الطبي" className="bot-avatar-img" />
                    </div>
                    <div className="message-bubble bot-bubble">
                      {msg.title && <p className="bot-title">{msg.title}</p>}
                      <p className="bot-text">{msg.text}</p>
                      <span className="timestamp bot-timestamp">{msg.time}</span>
                    </div>
                  </div>
                ) : (
                  <div className="user-message">
                    <div className="message-bubble user-bubble">
                      <p>{msg.text}</p>
                      <span className="timestamp">{msg.time}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="bot-message typing-indicator-row">
                <div className="bot-avatar">
                  <img src="/ai-avatar.png" alt="المساعد الطبي" className="bot-avatar-img" />
                </div>
                <div className="message-bubble bot-bubble typing-bubble">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions (ChatGPT style) */}
          {messages.length <= 3 && (
            <div className="quick-prompts-container">
              <div className="quick-prompts-scroll">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    className="prompt-chip"
                    onClick={() => handleSend(prompt.replace(/^[^\s]+\s/, ''))}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="input-container-wrapper">
            <div className="input-area">
              <input
                type="text"
                placeholder="اكتب الأعراض التي تشعر بها هنا..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                className={`send-btn ${inputText.trim() ? 'active' : ''}`}
                onClick={() => handleSend()}
                disabled={!inputText.trim()}
                title="إرسال"
                aria-label="إرسال"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p className="disclaimer-text">
              صحتك AI هو رفيق صحي استرشادي، ولا يُغني عن الفحص الطبي المباشر.
            </p>
          </div>
        </main>

        {/* ====================================================
            ChatGPT-style Spotlight Search Dialog
        ==================================================== */}
        {isSearchOpen && (
          <div className="search-modal-backdrop" onClick={() => setIsSearchOpen(false)}>
            <div className="search-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="search-input-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-modal-icon">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="ابحث في سجل المحادثات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="clear-search-btn" onClick={() => setSearchQuery('')}>×</button>
                )}
                <kbd className="esc-badge">ESC</kbd>
              </div>

              <div className="search-results-list">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      className={`search-result-item ${activeChatId === item.id ? 'active' : ''}`}
                      onClick={() => handleSelectChat(item.id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="result-chat-icon">
                        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                      </svg>
                      <div className="result-text-block">
                        <span className="result-title">{item.title}</span>
                        <span className="result-subtitle">محادثة سابقة</span>
                      </div>
                      <span className="jump-arrow">←</span>
                    </div>
                  ))
                ) : (
                  <div className="no-search-results">
                    <p>لا توجد محادثات مطابقة لـ &quot;{searchQuery}&quot;</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
