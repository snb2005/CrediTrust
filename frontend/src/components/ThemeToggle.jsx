import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../App';

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label="Toggle theme"
    >
      <div className="theme-toggle-icon">
        {isDark ? <Sun size={24} /> : <Moon size={24} />}
      </div>
    </button>
  );
};

export default ThemeToggle;
