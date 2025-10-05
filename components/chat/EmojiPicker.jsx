"use client"

import { useMemo } from "react"

export default function EmojiPicker({ onSelect }) {
  const emojis = useMemo(
    () => [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "😂",
      "😊",
      "🙂",
      "😉",
      "😍",
      "😘",
      "😜",
      "🤗",
      "🤔",
      "👍",
      "🙏",
      "👏",
      "🔥",
      "💯",
      "🎉",
      "❤️",
      "🥳",
      "😎",
      "😇",
      "🙌",
      "🤝",
      "🤩",
      "😢",
      "😡",
    ],
    [],
  )

  return (
    <div
      role="dialog"
      aria-label="Emoji picker"
      className="z-50 w-64 rounded-md border border-border bg-popover p-2 shadow-md"
    >
      <div className="grid grid-cols-8 gap-1 text-xl">
        {emojis.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onSelect?.(e)}
            className="h-8 w-8 rounded hover:bg-accent flex items-center justify-center"
            aria-label={`Insert ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}
