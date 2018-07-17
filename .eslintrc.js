module.exports = {
  extends: 'airbnb-base',
  env: {
    browser: true,
    es6: true,
  },
  rules: {
    'semi': ['error', 'never'],
    'quote-props': ['error', 'consistent-as-needed'],
    'implicit-arrow-linebreak': 'off',
    'arrow-parens': ['error', 'as-needed'],
    'no-param-reassign': ['error', { props: false }],
    'no-console': 'off',
    'no-plusplus': 'off',
    'import/prefer-default-export': 'off',
  },
}