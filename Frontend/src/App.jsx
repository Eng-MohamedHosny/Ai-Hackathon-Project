import './App.css'

function App() {
  return (
    <div className="app">
      <div className="container">
        {/* Right Sidebar */}
        <aside className="sidebar">
          <div className="logo">
            <img src="/logo.png" alt="صحتك" className="logo-img" />
          </div>

          <button className="new-chat-btn">
            <span>محادثة جديدة</span>
            <span className="plus-icon">+</span>
          </button>

          <div className="chat-history">
            <h3 className="history-title">تاريخ المحادثات</h3>
            <div className="history-list">
              <div className="history-item active">
                <span className="history-dot"></span>
                <span>وجع في البطن و صداع</span>
              </div>
              <div className="history-item">
                <span className="history-dot"></span>
                <span>حاسس بوجع في القولون</span>
              </div>
              <div className="history-item">
                <span className="history-dot"></span>
                <span>مليش نفس آكل</span>
              </div>
            </div>
          </div>

          <div className="bottom-section">
            <div className="emergency-card" dir="ltr">
              <div className="emergency-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.5a16 16 0 0 0 6 6l.89-.89a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z" />
                </svg>
              </div>
              <div className="emergency-content">
                <h4>Emergency?</h4>
                <p>Find immediate care</p>
              </div>
              <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>

            <div className="profile-card" dir="ltr">
              <div className="avatar">AK</div>
              <div className="profile-info">
                <h4>Ahmed K.</h4>
                <span>Premium Member</span>
              </div>
              <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </aside>

        {/* Left Chat Area */}
        <main className="chat-area">
          <div className="chat-messages">
            {[1, 2, 3].map((_, index) => (
              <div key={index} className="message-group">
                <div className="bot-message">
                  <div className="bot-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="10" rx="2" />
                      <circle cx="12" cy="7" r="4" />
                      <path d="M8 11V9a4 4 0 0 1 8 0v2" />
                    </svg>
                  </div>
                  <div className="message-bubble bot-bubble">
                    <p className="bot-title">أهلا أنا موجود هنا لخدمتك</p>
                    <p className="bot-subtitle">لو سمحت قولي حاسس بايه انهاردة</p>
                  </div>
                </div>

                <div className="user-message">
                  <div className="message-bubble user-bubble">
                    <p>حاسس بصداع و فقدان للتوازن و وجع في القولون</p>
                    <span className="timestamp">10:31 AM</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="input-area">
            <input
              type="text"
              placeholder="Type your symptoms here..."
              dir="ltr"
            />
            <button className="mic-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
            <button className="send-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
