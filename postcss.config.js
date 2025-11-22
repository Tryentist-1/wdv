const path = require('path');

module.exports = {
  plugins: {
    '@tailwindcss/postcss': {
      base: path.resolve(__dirname, 'css/tailwind.css'),
    },
    autoprefixer: {},
  },
};

