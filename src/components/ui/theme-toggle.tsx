import React from 'react';
import { Moon, Sun, Monitor, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, colorTheme, setTheme, setColorTheme, confirmThemeChange } = useTheme();

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'win95') => {
    if (newTheme !== theme) {
      const confirmed = await confirmThemeChange(newTheme, 'theme');
      if (confirmed) {
        await setTheme(newTheme);
      }
    }
  };

  const handleColorThemeChange = async (newColorTheme: 'green' | 'blue' | 'red' | 'orange' | 'purple') => {
    if (newColorTheme !== colorTheme) {
      const confirmed = await confirmThemeChange(newColorTheme, 'color');
      if (confirmed) {
        await setColorTheme(newColorTheme);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleThemeChange('light')}
        className={`${theme === 'light' ? 'bg-accent' : ''} hover:bg-accent`}
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">Light Mode</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleThemeChange('dark')}
        className={`${theme === 'dark' ? 'bg-accent' : ''} hover:bg-accent`}
      >
        <Moon className="h-4 w-4" />
        <span className="sr-only">Dark Mode</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleThemeChange('win95')}
        className={`${theme === 'win95' ? 'bg-accent' : ''} hover:bg-accent`}
      >
        <Monitor className="h-4 w-4" />
        <span className="sr-only">Windows 95 Mode</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-accent"
          >
            <Palette className="h-4 w-4" />
            <span className="sr-only">Color Theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => handleColorThemeChange('green')}
            className={`${colorTheme === 'green' ? 'bg-social-green text-white' : ''}`}
          >
            Green Theme
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleColorThemeChange('blue')}
            className={`${colorTheme === 'blue' ? 'bg-social-blue text-white' : ''}`}
          >
            Blue Theme
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleColorThemeChange('red')}
            className={`${colorTheme === 'red' ? 'bg-destructive text-white' : ''}`}
          >
            Red Theme
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleColorThemeChange('orange')}
            className={`${colorTheme === 'orange' ? 'bg-orange-500 text-white' : ''}`}
          >
            Orange Theme
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleColorThemeChange('purple')}
            className={`${colorTheme === 'purple' ? 'bg-purple-500 text-white' : ''}`}
          >
            Purple Theme
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}