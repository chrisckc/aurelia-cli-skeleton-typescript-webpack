const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
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
const staticDir = path.resolve(__dirname, 'static');
const assetsDir = path.resolve(srcDir, 'assets');
const imageDir = path.resolve(assetsDir, 'images');
const sassDir = path.resolve(assetsDir, 'sass');
const nodeModulesDir = path.resolve(__dirname, 'node_modules');
const baseUrl = '/';

// used in the css rules sections below
const cssRules = [
  { loader: 'css-loader' },
  { loader: 'postcss-loader',
    options: { plugins: () => [ require('autoprefixer') ] }
  }
];

// used in the sass rules sections below
const sassRules = cssRules.concat([
  { loader: 'sass-loader', // Loads a SASS/SCSS file and compiles it to CSS
    options: { includePaths: [ sassDir ] } // allows sass files in src/assets/sass to imported in other sass files without the path
  }
]);

// Used in the HtmlWebpackPlugin chunksSortMode
function IndexInRegexArray(stringToMatch, regexArray, notFoundIndex) {
  for (let i = 0; i < regexArray.length; i++) {
      if (stringToMatch.match(regexArray[i])) return i;
  }
  return notFoundIndex !== undefined ? notFoundIndex : -1;
};

module.exports = ({production, server, extractCss, coverage, analyze, karma} = {}) => ({
  resolve: {
    extensions: [ '.ts', '.tsx', '.js' ],
    modules: [ srcDir, nodeModulesDir ],
    // Enforce single aurelia-binding, to avoid v1/v2 duplication due to
    // out-of-date dependencies on 3rd party aurelia plugins
    alias: { 'aurelia-binding': path.resolve(__dirname, 'node_modules/aurelia-binding') }
  },
  entry: {
    app: [ 'aurelia-bootstrapper' ], // the entry bundle will be named 'app'
  },
  mode: production ? 'production' : 'development',
  output: {
    path: outDir,
    publicPath: baseUrl,
    filename: production ? '[name].[chunkhash].bundle.js' : '[name].[hash].bundle.js',
    sourceMapFilename: production ? '[name].[chunkhash].map' : '[name].[hash].map',
    chunkFilename: production ? '[name].[chunkhash].chunk.js' : '[name].[hash].chunk.js'
  },
  optimization: {
    runtimeChunk: true,
    // moduleIds is the replacement for HashedModuleIdsPlugin and NamedModulesPlugin which were deprecated in https://github.com/webpack/webpack/releases/tag/v4.16.0
    // changes module id's to use hashes be based on the relative path of the module, required for long term cacheability
    moduleIds: 'hashed',
    // If we use the default splitChunks config we can end up with large app and vendor files > 1MB
    // https://webpack.js.org/plugins/split-chunks-plugin/
    splitChunks: { 
      hidePathInfo: true, // prevents the path from being used in the filename when using maxSize
      chunks: 'initial', // default is async, set to initial and then use async inside cacheGroups instead
      //maxInitialRequests: 6, // Default is 3, make this unlimited if using HTTP/2
      //maxAsyncRequests: Infinity, // Default is 5, make this unlimited if using HTTP/2
      // sizes are compared against source before minification
      maxSize: 200000, // splits chunks if bigger than 200k, added in webpack v4.15
      cacheGroups: { // create separate js files for bluebird, jQuery, bootstrap, aurelia and one for the remaining node modules
        default: false, // disable the built-in groups, default & vendors (vendors is overwritten below)
        // TODO: enable treeshaking (@fortawesome/free-solid-svg-icons) to reduce the size of font-awesome to only what is used ref: https://fontawesome.com/how-to-use/with-the-api/other/tree-shaking
        fontawesome: { // separates out font-awesome (font-awesome is only css/fonts) from app css
          name: 'vendor.font-awesome',
          test:  /[\\/]node_modules[\\/]font-awesome[\\/]/,
          priority: 80,
          enforce: true
        },
        bootstrapExtra: { // separates out bootstrap css from app css
          test: /[\\/]sass[\\/]bootstrap[\\/]bootstrap-extra.(s)?css$/,
          name: 'vendor.bootstrap-extra',
          priority: 70,
          enforce: true
        },
        bootstrap: { // separates out bootstrap (js and css) from app css
          test: /[\\/]node_modules[\\/]bootstrap[\\/]|[\\/]sass[\\/]bootstrap[\\/]/,
          name: 'vendor.bootstrap',
          priority: 60,
          enforce: true
        },
        vendors: { // picks up everything from node_modules as long as the sum of node modules is larger than minSize
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 19,
          enforce: true, // causes maxInitialRequests to be ignored, minSize still respected if specified in cacheGroup
          minSize: 30000 // use the default minSize
        },
        vendorsAsync: { // vendors async chunk, remaining asynchronously used node modules as single chunk file
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors.async',
          chunks: 'async',
          priority: 9,
          reuseExistingChunk: true,
          minSize: 10000  // use smaller minSize to avoid too much potential bundle bloat due to module duplication.
        },
        commonsAsync: { // commons async chunk, remaining asynchronously used modules as single chunk file
          name: 'commons.async',
          minChunks: 2, // Minimum number of chunks that must share a module before splitting
          chunks: 'async',
          priority: 0,
          reuseExistingChunk: true,
          minSize: 10000  // use smaller minSize to avoid too much potential bundle bloat due to module duplication.
        }
      }
    },
    // Setting optimization.minimizer overrides the defaults provided by webpack
    // so when adding OptimizeCSSAssetsPlugin to the minimizer config, we need to add UglifyJsPlugin to match the defaults otherwise our js won't be minimised.
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
        sourceMap: true // set to true if you want JS source maps
      }),
      ...production ? [ new OptimizeCSSAssetsPlugin({}) ] : [] // optimise css only in production mode
    ]
  },
  performance: { hints: false },
  devServer: {
    contentBase: false,
    // serve index.html for all 404 (required for push-state)
    historyApiFallback: true,
    overlay: { warnings: true, errors: true }  
  },
  devtool: production ? 'nosources-source-map' : 'cheap-module-eval-source-map',
  module: {
    rules: [
      // CSS required in JS/TS files should use the style-loader that auto-injects it into the website
      // only when the issuer is a .js/.ts file, so the loaders are not applied inside html templates
      {
        test: /\.css$/i,
        issuer: [{ not: [{ test: /\.html$/i }] }],
        // When the extractCss webpack option is used, use the MiniCssExtractPlugin, else style-loader
        // style-loader adds CSS to the DOM by injecting a `<style>` tag
        use: [{ loader: extractCss ? MiniCssExtractPlugin.loader  : 'style-loader' }, ...cssRules ]
      },
      {
        test: /\.css$/i,
        issuer: [{ test: /\.html$/i }],
        // CSS required in templates cannot be extracted safely because Aurelia would try to require it again in runtime
        use: cssRules
      },
      {
        test: /\.sass$|\.scss$/i,
        issuer: /\.[tj]s$/i,
        use: [{ loader: extractCss ? MiniCssExtractPlugin.loader : 'style-loader' }, ... sassRules ]
      },
      {
        test: /\.sass$|\.scss$/i,
        issuer: /\.html?$/i,
        use: sassRules
      },
      { test: /\.html$/i, loader: 'html-loader' },
      { test: /\.tsx?$/i, loader: 'ts-loader' },
      // use Bluebird as the global Promise implementation:
      { test: /[\/\\]node_modules[\/\\]bluebird[\/\\].+\.js$/, loader: 'expose-loader?Promise' },
      // exposes jQuery globally as $ and as jQuery:
      { test: require.resolve('jquery'), loader: 'expose-loader?$!expose-loader?jQuery' },
      // embed small images as Data Urls and larger ones as files: also matches versioned files such as .png?snv7e7vns43
      { test: /\.(png|jpe?g|gif)(\?.*)?$/i, loader: 'url-loader', options: { limit: 8192, name: '[name].[hash].[ext]', outputPath: './images/' } },
      // matches svg files in the assets/images dir
      { test: /\.svg(\?.*)?$/i, include: [ imageDir ], loader: 'url-loader', options: { limit: 8192, name: '[name].[hash].[ext]', outputPath: './images/' } },
      // matches media files .mp4 etc.
      { test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i, loader: 'url-loader', options: { limit: 8192, name: '[name].[hash].[ext]', outputPath: './media/' } },
      // matches woff font files
      { test: /\.woff2(\?.*)?$/i, loader: 'url-loader', options: { limit: 10000, mimetype: 'application/font-woff2', name: '[name].[hash].[ext]', outputPath: './fonts/' } },
      { test: /\.woff(\?.*)?$/i, loader: 'url-loader', options: { limit: 10000, mimetype: 'application/font-woff', name: '[name].[hash].[ext]', outputPath: './fonts/' } },
      // matches other font files, load these fonts normally, as files:
      { test: /\.(ttf|eot|svg|otf|cur)(\?.*)?$/i,
        exclude: [ imageDir ], //exclude any svg files in 'assets/images' dir
        loader: 'file-loader', options: { name: '[name].[hash].[ext]', outputPath: './fonts/' },
      },
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
      // if there is no need to reference bootstrap's jQuery extensions in code eg. $('selector').collapse('hide');
      // Alert: 'exports-loader?Alert!bootstrap/js/dist/alert',
      // Button: 'exports-loader?Button!bootstrap/js/dist/button',
      // Carousel: 'exports-loader?Carousel!bootstrap/js/dist/carousel',
      // Collapse: 'exports-loader?Collapse!bootstrap/js/dist/collapse',
      // Dropdown: 'exports-loader?Dropdown!bootstrap/js/dist/dropdown',
      // Modal: 'exports-loader?Modal!bootstrap/js/dist/modal',
      // Popover: 'exports-loader?Popover!bootstrap/js/dist/popover',
      // Scrollspy: 'exports-loader?Scrollspy!bootstrap/js/dist/scrollspy',
      // Tab: 'exports-loader?Tab!bootstrap/js/dist/tab',
      // Tooltip: 'exports-loader?Tooltip!bootstrap/js/dist/tooltip',
      // Util: 'exports-loader?Util!bootstrap/js/dist/util',
    }),
    new ModuleDependenciesPlugin({
      'aurelia-testing': [ './compile-spy', './view-spy' ]
    }), 
    new HtmlWebpackPlugin({
      template: 'index.ejs',
      chunksSortMode: (chunkA, chunkB) => {
        let chunkOrderMatches = [ /^vendor/ ];
        let orderA = IndexInRegexArray(chunkA.names[0], chunkOrderMatches, 9999);
        let orderB = IndexInRegexArray(chunkB.names[0], chunkOrderMatches, 9999);
        if (chunkA.entry) orderA = -1;
        if (chunkB.entry) orderB = -1;
        return (orderA + (1 / (chunkA.size + 2))) - (orderB + (1 / (chunkB.size + 2)));
      },
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
      filename: production ? 'css/[name].[contenthash].bundle.css' : '[name].[hash].bundle.css',
      chunkFilename: production ? 'css/[name].[contenthash].chunk.css' : '[name].[hash].chunk.css'
    })),
    // url-loader handles bundling of png/jpg/gif/svg etc.
    // We only need to specify files here that are not referenced in the source files
    // ref: https://webpack.js.org/plugins/copy-webpack-plugin/
    ...when(production || server, new CopyWebpackPlugin([
      { from: 'static', to: outDir, ignore: ['.*'] } // ignore dot (hidden) files
    ])),
    ...when(analyze, new BundleAnalyzerPlugin({ analyzerPort: 9080 }))  // changed the port from 8888 to 9080
  ]
});
