import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ isDark: false, toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('ddias-theme');
    return saved === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('ddias-theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark(!isDark) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
