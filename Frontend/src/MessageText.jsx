import { useMemo } from 'react'

const URL_REGEX = /(https?:\/\/[^\s<>,;:"'()\[\]]+)/g

export default function MessageText({ text }) {
  const parts = useMemo(() => {
    if (!text) return []
    const matches = text.match(URL_REGEX)
    if (!matches) return [{ type: 'text', value: text }]

    const result = []
    let remaining = text

    matches.forEach((url) => {
      const index = remaining.indexOf(url)
      if (index === -1) return
      if (index > 0) {
        result.push({ type: 'text', value: remaining.slice(0, index) })
      }
      result.push({ type: 'link', value: url })
      remaining = remaining.slice(index + url.length)
    })

    if (remaining) {
      result.push({ type: 'text', value: remaining })
    }

    return result
  }, [text])

  return (
    <>
      {parts.map((part, idx) =>
        part.type === 'link' ? (
          <a
            key={idx}
            href={part.value}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-link"
            dir="ltr"
          >
            {part.value}
          </a>
        ) : (
          <span key={idx}>{part.value}</span>
        )
      )}
    </>
  )
}
