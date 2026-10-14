import { defineConfig, globalIgnores } from 'eslint/config'
import boundaries from 'eslint-plugin-boundaries'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

// Component tiers (manual 6.3): each layer may import only from the layers below it.
// `commerce` holds SokoMesh project extensions shared by several features (spec p.55).
const allow = (from, to) => ({
  from: { element: { type: from } },
  allow: { to: { element: { types: { anyOf: to } } } },
})

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['app/**', 'components/**', 'features/**', 'lib/**'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'ui', pattern: 'components/ui' },
        { type: 'layout', pattern: 'components/layout' },
        { type: 'kernel', pattern: 'components/kernel' },
        { type: 'commerce', pattern: 'components/commerce' },
        { type: 'feature', pattern: 'features/*', capture: ['feature'] },
        { type: 'lib', pattern: 'lib' },
        { type: 'route', pattern: 'app' },
      ],
    },
    rules: {
      'boundaries/dependencies': ['error', {
        default: 'disallow',
        policies: [
          { allow: { to: { module: { origin: ['external', 'core'] } } } },
          allow('lib', ['lib']),
          allow('ui', ['ui', 'lib']),
          allow('layout', ['ui', 'layout', 'lib']),
          allow('kernel', ['ui', 'layout', 'kernel', 'lib']),
          allow('commerce', ['ui', 'layout', 'kernel', 'lib', 'commerce']),
          allow('feature', ['ui', 'layout', 'kernel', 'commerce', 'lib', 'feature']),
          allow('route', ['ui', 'layout', 'kernel', 'commerce', 'feature', 'lib', 'route']),
        ],
      }],
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Generated: fix the generator, never the output.
    'lib/contract/generated.ts',
    'lib/design/tokens.generated.ts',
  ]),
])
