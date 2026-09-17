// ========================================
// Tailwind CSS Configuration (Shared)
// ========================================
tailwind.config = {
    theme: {
        extend: {
            colors: {
                navy: { DEFAULT: '#1A2B4C', hover: '#132038', light: '#2A3C60' },
                gold: { DEFAULT: '#E5AA22', hover: '#D49B1A', light: '#F4C14E' },
                surface: '#F8FAFC',
                glass: 'rgba(255, 255, 255, 0.7)',
            },
            fontFamily: { sans: ['Poppins', 'sans-serif'] },
            boxShadow: {
                'soft': '0 10px 40px -10px rgba(0,0,0,0.08)',
                'glow': '0 0 20px rgba(229, 170, 34, 0.3)',
            },
            animation: {
                'float': 'float 3s ease-in-out infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                }
            }
        }
    }
};
