import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // SPA client-side routing: serve index.html for all routes
  appType: 'spa',
  
  // Build optimizations
  build: {
    // Use esbuild for minification (faster than terser, included by default)
    minify: 'esbuild',
    
    // Code splitting configuration
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'chart-vendor': ['recharts'],
        },
        
        // Asset file naming for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 500, // KB
    
    // Source maps for production debugging (optional)
    sourcemap: false,
    
    // CSS code splitting
    cssCodeSplit: true,
  },
  
  // esbuild options for production
  esbuild: {
    drop: ['console', 'debugger'], // Remove console logs in production
  },
  
  // Development optimizations
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  
  // Server configuration
  server: {
    // Enable HMR
    hmr: true,
  },
  
  // Preview server (for testing production builds)
  preview: {
    port: 4173,
  },
})

