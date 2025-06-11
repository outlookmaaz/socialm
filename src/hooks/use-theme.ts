import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'win95';
type ColorTheme = 'green' | 'blue' | 'red' | 'orange' | 'purple';

interface ThemeStore {
  theme: Theme;
  colorTheme: ColorTheme;
  setTheme: (theme: Theme) => Promise<void>;
  setColorTheme: (colorTheme: ColorTheme) => Promise<void>;
  confirmThemeChange: (theme: Theme | ColorTheme, type: 'theme' | 'color') => Promise<boolean>;
}

// Simple localStorage storage
const customStorage = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name);
    } catch {
      // Ignore storage errors
    }
  },
};

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      colorTheme: 'green',
      setTheme: async (theme) => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark', 'win95');
        root.classList.add(theme);
        set({ theme });
      },
      setColorTheme: async (colorTheme) => {
        const root = window.document.documentElement;
        root.classList.remove('theme-green', 'theme-blue', 'theme-red', 'theme-orange', 'theme-purple');
        if (colorTheme !== 'green') {
          root.classList.add(`theme-${colorTheme}`);
        }
        set({ colorTheme });
      },
      confirmThemeChange: async (theme, type) => {
        return new Promise((resolve) => {
          const dialog = document.createElement('div');
          dialog.innerHTML = `
            <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div class="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <h3 class="text-lg font-medium mb-4 font-pixelated">Change ${type === 'theme' ? 'Theme' : 'Color'}</h3>
                <p class="text-sm text-muted-foreground mb-6 font-pixelated">
                  Are you sure you want to change the ${type === 'theme' ? 'theme' : 'color theme'} to ${theme}? This will be saved as your preference.
                </p>
                <div class="flex justify-end gap-3">
                  <button class="px-4 py-2 text-sm font-pixelated bg-muted hover:bg-muted/80 rounded-md" onclick="this.closest('.fixed').remove(); window.resolveTheme(false);">
                    Cancel
                  </button>
                  <button class="px-4 py-2 text-sm font-pixelated bg-primary text-primary-foreground hover:bg-primary/90 rounded-md" onclick="this.closest('.fixed').remove(); window.resolveTheme(true);">
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          `;
          
          document.body.appendChild(dialog);
          
          (window as any).resolveTheme = (confirmed: boolean) => {
            delete (window as any).resolveTheme;
            resolve(confirmed);
          };
        });
      }
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => customStorage),
      partialize: (state) => ({ theme: state.theme, colorTheme: state.colorTheme }),
    }
  )
);