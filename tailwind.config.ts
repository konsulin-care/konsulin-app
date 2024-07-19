import type { Config } from 'tailwindcss'

const config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}'
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      boxShadow: {
        'switch-thumb-setting':
          '1px 2px 4px 0px #0000001A, 0px 2px 2px 0px #0000001A, 1px 1px 2px 0px #0000001A'
      },
      backgroundImage: {
        'switch-gradient-checked-line':
          'linear-gradient(127deg, #77D0CF 0%, #5E81AC 100%)',
        'switch-gradient-unchecked-line':
          'linear-gradient(180deg, #B8B8B8 0%, #DCDCDC 100%)',
        'switch-gradient-thumb':
          'linear-gradient(180deg, #FFFFFF 0%, #F7F7F7 100%)'
      },
      colors: {
        border: 'var(--border)',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'var(--primary)'
          // foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'var(--secondary)'
          // foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))'
          // foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'var(--muted)'
          // foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))'
          // foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))'
          // foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))'
          // foreground: 'hsl(var(--card-foreground))'
        }
      },
      borderRadius: {
        xl: 'calc(var(--radius) *2 )',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
} satisfies Config

export default config
