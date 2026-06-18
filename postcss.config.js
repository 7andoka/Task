import tailwindcss from '@tailwindcss/postcss';
import postcssCascadeLayers from '@csstools/postcss-cascade-layers';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [
    tailwindcss(),
    postcssCascadeLayers(),
    autoprefixer(),
  ],
};
