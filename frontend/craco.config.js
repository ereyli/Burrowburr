const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add fallbacks for node modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "util": require.resolve("util/"),
        "stream": require.resolve("stream-browserify"),
        "crypto": require.resolve("crypto-browserify"),
        "buffer": require.resolve("buffer"),
        "assert": require.resolve("assert"),
        "process": require.resolve("process/browser"),
        "path": require.resolve("path-browserify"),
        "os": require.resolve("os-browserify/browser"),
        "fs": false,
        "net": false,
        "tls": false,
        "child_process": false,
        "worker_threads": false,
        "perf_hooks": false,
        "v8": false,
        "vm": require.resolve("vm-browserify"),
        "url": require.resolve("url/"),
        "querystring": require.resolve("querystring-es3"),
        "https": require.resolve("https-browserify"),
        "http": require.resolve("stream-http"),
        "zlib": require.resolve("browserify-zlib"),
        "events": require.resolve("events/"),
        "constants": require.resolve("constants-browserify"),
      };

      // Add buffer and process plugins
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );

      // Add DefinePlugin for environment variables
      webpackConfig.plugins.push(
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
          'process.version': JSON.stringify(process.version),
          'process.browser': JSON.stringify(true),
          'global': 'globalThis',
        })
      );

      // Ignore source map warnings
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
        /Critical dependency: the request of a dependency is an expression/
      ];

      // Configure module rules for better compatibility
      webpackConfig.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false
        }
      });

      return webpackConfig;
    },
  },
}; 