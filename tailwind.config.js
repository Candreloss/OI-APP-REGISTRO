// tailwind.config.js — Fase 3: Tailwind compilado (sin CDN).
module.exports = {
    content: [
        './src/views/**/*.ejs',
        './public/js/**/*.js'
    ],
    safelist: ['matriz-row'],
    theme: {
        extend: {}
    },
    plugins: []
};
