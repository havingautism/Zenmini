import React from 'react'

export default function InputWithIcon({ id, name, label, value, onChange, icon, isPassword = false }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-accent-subtle mb-1">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-subtle">
          {icon}
        </span>
        <input
          id={id}
          name={name}
          type={isPassword ? 'password' : 'text'}
          value={value}
          onChange={onChange}
          className="w-full p-2 pl-10 text-sm bg-shell rounded-md border border-border shadow-inner focus:outline-none text-accent"
        />
      </div>
    </div>
  )
}

