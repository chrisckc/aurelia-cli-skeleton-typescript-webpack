const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const DuplicatePackageCheckerPlugin = require('duplicate-package-checker-webpack-plugin');
const project = require('./aurelia_project/aurelia.json');
const { AureliaPlugin, ModuleDependenciesPlugin } = require('aurelia-webpack-plugin');
const { ProvidePlugin } = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

// config helpers:
const ensureArray = (config) => config && (Array.isArray(config) ? config : [config]) || [];
const when = (condition, config, negativeConfig) =>
  condition ? ensureArray(config) : ensureArray(negativeConfig);

// primary config:
const title = 'Aurelia Navigation Skeleton';
const outDir = path.resolve(__dirname, project.platform.output);
const srcDir = path.resolve(__dirname, 'src');
const nodeModulesDir = path.resolve(__dirname, 'node_modules');
const baseUrl = '/app';

// used in the rules sections below
const cssRules = [
  { loader: 'css-loader' },
];

// used in the rules sections below
const sassRules = [
  {
    loader: 'css-loader' // Interprets `@import` and `url()` like `import/require()` and will resolve them
  },
  {
    loader: 'postcss-loader', // Loader for webpack to process CSS with PostCSS
    options: {
      plugins: function () {
        return [
          require('autoprefixer')
        ];
      }
    }
  },
  {
    loader: 'sass-loader' // Loads a SASS/SCSS file and compiles it to CSS
  }
];

module.exports = ({production, server, extractCss, coverage, analyze, karma} = {}) => ({
  resolve: {
    extensions: ['.ts', '.js'],
    modules: [srcDir, 'node_modules'],
    // Enforce single aurelia-binding, to avoid v1/v2 duplication due to
    // out-of-date dependencies on 3rd party aurelia plugins
    alias: { 'aurelia-binding': path.resolve(__dirname, 'node_modules/aurelia-binding') }
  },
  entry: {
    app: ['aurelia-bootstrapper'],
    // vendor: ['bluebird', 'jquery', 'bootstrap'], // Removed in favour of webpack4 optimization.splitChunks
  },
  mode: production ? 'production' : 'development',
  output: {
    path: outDir,
    publicPath: baseUrl,
    filename: production ? '[name].[chunkhash].bundle.js' : '[name].[hash].bundle.js',
    sourceMapFilename: production ? '[name].[chunkhash].map' : '[name].[hash].map',
    chunkFilename: production ? '[name].[chunkhash].chunk.js' : '[name].[hash].chunk.js'
  },
  // DONE: added UglifyJsPlugin and  OptimizeCSSAssetsPlugin, ref https://webpack.js.org/plugins/mini-css-extract-plugin/#minimizing-for-production
  optimization: {
    // It seems that webpack requires some help in splitting up aurelia, jquery and bootstrap etc. from the main app bundle
    // If we don't split it up we end up with large app and vendor files > 1MB 
    splitChunks: { // https://webpack.js.org/plugins/split-chunks-plugin/
      chunks: "initial",
      cacheGroups: { // create separate js files for bluebird, jQuery, bootstrap, aurelia and one for the remaining node modules
        default: false, // disable the built-in groups (default and vendors)
        vendors: false,
        // enforce: true is required in the definitions below to avoid an issue in production mode
        // for some reason, in production mode, the aurelia chunk is not created unless "enforce: true" is used despite it being bigger than 30k, processing seems to stop after jquery
        bluebird: {
          test: /[\\/]node_modules[\\/]bluebird[\\/]/,
          name: "vendor.bluebird",
          enforce: true,
          priority: 60
        },
        jquery: {
          test: /[\\/]node_modules[\\/]jquery[\\/]/,
          name: "vendor.jquery",
          enforce: true,
          reuseExistingChunk: true,
          priority: 50
        },
        fontawesome: { // TODO: enable treeshaking (@fortawesome/free-solid-svg-icons) to reduce the size of font-awesome to only what is used ref: https://fontawesome.com/how-to-use/with-the-api/other/tree-shaking
          name: 'vendor.font-awesome',
          test:  /[\\/]node_modules[\\/]font-awesome[\\/]/,
          enforce: true,
          reuseExistingChunk: true,
          priority: 40
        },
        bootstrap: {
          test: /[\\/]node_modules[\\/]bootstrap[\\/]|sass[\\/]bootstrap.(s)?css$/,
          name: "vendor.bootstrap",
          enforce: true,
          priority: 30
        },
        aureliaBinding: {
          test: /[\\/]node_modules[\\/]aurelia-binding[\\/]/,
          name: "vendor.app.1",
          enforce: true,
          priority: 28
        },
        aureliaTemplating: {
          test: /[\\/]node_modules[\\/]aurelia-templating[\\/]/,
          name: "vendor.app.2",
          enforce: true,
          priority: 26
        },
        aurelia: {
          test: /[\\/]node_modules[\\/]aurelia-.*[\\/]/,
          name: "vendor.app.3",
          enforce: true,
          priority: 20
        },
        vendors: { // this picks up everything else being used from node_modules
          test: /[\\/]node_modules[\\/]/,
          name: "vendor",
          enforce: true,
          priority: 10
        },
        common: { // common chunk
          name: 'common',
          minChunks: 2,   // Creates a new chunk if a module is shared between different chunks more than twice
          chunks: 'async',
          priority: 0,
          reuseExistingChunk: true,
          enforce: true
        }
      }
    },
    minimizer: [
      new UglifyJsPlugin({
        cache: true,
        parallel: true,
        sourceMap: true // set to true if you want JS source maps
      }),
      ...production ? [ new OptimizeCSSAssetsPlugin({}) ] : [] // optimise css only in production mode
    ]
  },
  performance: { hints: false },
  devServer: {
    contentBase: outDir,
    // serve index.html for all 404 (required for push-state)
    historyApiFallback: true
  },
  devtool: production ? 'nosources-source-map' : 'cheap-module-eval-source-map',
  module: {
    rules: [
      // CSS required in JS/TS files should use the style-loader that auto-injects it into the website
      // only when the issuer is a .js/.ts file, so the loaders are not applied inside html templates
      {
        test: /\.css$/i,
        issuer: [{ not: [{ test: /\.html$/i }] }],
        use: extractCss ? [{
            loader: MiniCssExtractPlugin.loader  // When the extractCss webpack option is used, use the MiniCssExtractPlugin.
          }, 'css-loader'] : ['style-loader', ...cssRules]
      },
      {
        test: /\.css$/i,
        issuer: [{ test: /\.html$/i }],
        // CSS required in templates cannot be extracted safely
        // because Aurelia would try to require it again in runtime
        use: cssRules
      },
      // TODO: figure out how to extract bootstrap styles into separate css file  https://github.com/webpack-contrib/mini-css-extract-plugin/issues/45
      // DONE: achieved via optimization.splitChunks instead
      {
        test: /\.sass$|\.scss$/,
        issuer: /\.[tj]s$/i,
        use: [
          {
            loader: extractCss ? MiniCssExtractPlugin.loader : 'style-loader' // style-loader adds CSS to the DOM by injecting a `<style>` tag
          },
          ... sassRules
        ]
      },
      {
        test: /\.sass$|\.scss$/,
        issuer: /\.html?$/i,
        use: sassRules
      },
      { test: /\.html$/i, loader: 'html-loader' },
      { test: /\.ts$/, loader: "ts-loader" },
      // use Bluebird as the global Promise implementation:
      { test: /[\/\\]node_modules[\/\\]bluebird[\/\\].+\.js$/, loader: 'expose-loader?Promise' },
      // exposes jQuery globally as $ and as jQuery:
      { test: require.resolve('jquery'), loader: 'expose-loader?$!expose-loader?jQuery' },
      // embed small images and fonts as Data Urls and larger ones as files:
      { test: /\.(png|gif|jpg|cur)$/i, loader: 'url-loader', options: { limit: 8192 } },
      { test: /\.woff2(\?v=[0-9]\.[0-9]\.[0-9])?$/i, loader: 'url-loader', options: { limit: 10000, mimetype: 'application/font-woff2' } },
      { test: /\.woff(\?v=[0-9]\.[0-9]\.[0-9])?$/i, loader: 'url-loader', options: { limit: 10000, mimetype: 'application/font-woff' } },
      // load these fonts normally, as files:
      { test: /\.(ttf|eot|svg|otf)(\?v=[0-9]\.[0-9]\.[0-9])?$/i, loader: 'file-loader' },
      ...when(coverage, {
        test: /\.[jt]s$/i, loader: 'istanbul-instrumenter-loader',
        include: srcDir, exclude: [/\.{spec,test}\.[jt]s$/i],
        enforce: 'post', options: { esModules: true },
      })
    ]
  },
  plugins: [
    ...when(!karma, new DuplicatePackageCheckerPlugin()),
    new AureliaPlugin(),
    // When any of the libraries listed below is used it will be auto-required/imported without having to do it explicitly.
    new ProvidePlugin({ // 'auto-require' these libraries when encountered in a dependency
      'Promise': 'bluebird',
      '$': 'jquery',
      'jQuery': 'jquery',
      'window.jQuery': 'jquery',
      Popper: ['popper.js', 'default'], // Bootstrap 4 Dependency.
      // We can provide the bootstrap components here, only use this method instead of importing the bootstrap components in main.ts
      // if there is no need to reference bootstrap's jQuery extensions in code eg. $("selector").collapse('hide');
      // Alert: "exports-loader?Alert!bootstrap/js/dist/alert",
      // Button: "exports-loader?Button!bootstrap/js/dist/button",
      // Carousel: "exports-loader?Carousel!bootstrap/js/dist/carousel",
      // Collapse: "exports-loader?Collapse!bootstrap/js/dist/collapse",
      // Dropdown: "exports-loader?Dropdown!bootstrap/js/dist/dropdown",
      // Modal: "exports-loader?Modal!bootstrap/js/dist/modal",
      // Popover: "exports-loader?Popover!bootstrap/js/dist/popover",
      // Scrollspy: "exports-loader?Scrollspy!bootstrap/js/dist/scrollspy",
      // Tab: "exports-loader?Tab!bootstrap/js/dist/tab",
      // Tooltip: "exports-loader?Tooltip!bootstrap/js/dist/tooltip",
      // Util: "exports-loader?Util!bootstrap/js/dist/util",
    }),
    new ModuleDependenciesPlugin({
      'aurelia-testing': [ './compile-spy', './view-spy' ]
    }),
    new HtmlWebpackPlugin({
      template: 'index.ejs',
      minify: production ? {
        removeComments: true,
        collapseWhitespace: true
      } : undefined,
      metadata: {
        // available in index.ejs //
        title, server, baseUrl
      }
    }),
    // ref: https://webpack.js.org/plugins/mini-css-extract-plugin/
    ...when(extractCss, new MiniCssExtractPlugin({ // updated to match the naming conventions for the js files
      filename: production ? '[name].[contenthash].bundle.css' : '[name].[hash].bundle.css',
      chunkFilename: production ? '[name].[contenthash].chunk.css' : '[name].[hash].chunk.css'
    })),
    // ref: https://webpack.js.org/plugins/copy-webpack-plugin/
    ...when(production || server, new CopyWebpackPlugin([
      { from: 'static/favicon.ico', to: 'favicon.ico' },
    ])),
    ...when(analyze, new BundleAnalyzerPlugin({ analyzerPort: 9080 }))  // changed the port from 8888 to 9080
  ]
});
