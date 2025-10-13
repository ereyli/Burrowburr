module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Disable source map warnings for starknet types
      if (env === 'development') {
        const rules = webpackConfig.module.rules.find(rule => rule.oneOf);
        if (rules) {
          const sourceMapRule = rules.oneOf.find(rule => 
            rule.loader && rule.loader.includes('source-map-loader')
          );
          if (sourceMapRule) {
            sourceMapRule.exclude = [
              /node_modules\/@starknet-io\/starknet-types-/,
              ...(sourceMapRule.exclude || [])
            ];
          }
        }
      }
      
      // Suppress specific warnings
      webpackConfig.ignoreWarnings = [
        {
          module: /node_modules\/@starknet-io\/starknet-types-/,
          message: /Failed to parse source map/,
        },
        ...(webpackConfig.ignoreWarnings || [])
      ];
      
      return webpackConfig;
    },
  },
};