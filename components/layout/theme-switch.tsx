'use client';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/use-workspace';
export function ThemeSwitch({ expanded = false }: { expanded?: boolean }) {
  const { theme, setTheme } = useTheme();
  return (
    <div
      className={`theme-switch ${expanded ? 'expanded' : ''}`}
      role="group"
      aria-label="Color theme"
    >
      {(
        [
          { value: 'light', Icon: Sun },
          { value: 'dark', Icon: Moon },
          { value: 'system', Icon: Monitor },
        ] as const
      ).map(({ value, Icon }) => (
        <button
          type="button"
          key={value}
          title={`${value} theme`}
          aria-label={`Use ${value} theme`}
          aria-pressed={theme === value}
          className={theme === value ? 'selected' : ''}
          onClick={() => setTheme(value)}
        >
          <Icon size={15} />
          {expanded && <span>{value}</span>}
        </button>
      ))}
    </div>
  );
}
