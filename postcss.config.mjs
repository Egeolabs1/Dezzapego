/**
 * PostCSS Configuration
 *
 * Tailwind CSS v4 runs through @tailwindcss/postcss in the Next.js pipeline.
 *
 * This file only exists for adding additional PostCSS plugins, if needed.
 * For example:
 *
 * import postcssNested from 'postcss-nested'
 * export default { plugins: [postcssNested()] }
 *
 * Otherwise, you can leave this file empty.
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    'autoprefixer': {},
  },
};
