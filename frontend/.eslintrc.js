module.exports = {
  extends: ['react-app', 'react-app/jest'],
  globals: {
    BigInt: 'readonly',
  },
  env: {
    es2020: true,
    browser: true,
  },
}; 