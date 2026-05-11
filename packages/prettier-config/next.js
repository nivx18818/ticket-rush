import base from './base.js';

/** @type {import("prettier").Config & import('prettier-plugin-tailwindcss').PluginOptions} */
export default {
  ...base,
  plugins: [...base.plugins, 'prettier-plugin-tailwindcss'],
};
