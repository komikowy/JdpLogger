module.exports = {
  extends: ['expo'],
  env: {
    browser: true,
    jest: true,
  },
  globals: {
    WebSocket: 'readonly',
    performance: 'readonly',
  },
  rules: {
    'react/prop-types': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
