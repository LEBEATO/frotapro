import type { ChangeEventHandler } from 'react'
import { Search } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: ChangeEventHandler<HTMLInputElement>
  placeholder: string
  label: string
}

// O contêiner relativo e seu dimensionamento continuam na página.
export function SearchInput({ value, onChange, placeholder, label }: SearchInputProps) {
  return (
    <>
      <Search aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={label}
        className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/70 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
    </>
  )
}
