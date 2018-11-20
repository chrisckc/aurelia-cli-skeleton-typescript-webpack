# aurelia-cli-skeleton-typescript-webpack

Aurelia CLI was used to create the ClientApp dir, the Aurelia template files from the latest "Aurelia Skeleton Navigation" repo were then added (latest skeleton-typescript-webpack uses bootstrap v4).

https://github.com/aurelia/skeleton-navigation/tree/master/skeleton-typescript-webpack

Created as a starter for Aurelia projects.

#### Notes

Fixed issue in skeleton-typescript-webpack template where hamburger menu does not collapse after selecting menu item.

https://github.com/aurelia/cli/issues/958

Added Sass support to webpack config and scss files to allow bootstrap v4 customisation and compilation.

Updated webpack config to split out the vendor bundle into smaller more sensible sizes. Separated bootstrap and jQuery into their own bundles, separated Aurelia into 3 separate bundles as its still too big as a single bundle.

Updated the Bootstrap v4 nav-bar style to make it look more like the previous Bootstrap v3 nav-bar in the Aurelia skeletons

Incorporated suggestions from here: https://github.com/aurelia/cli/issues/968 refer to the image-test view

Incorporated fix: https://github.com/aurelia/cli/issues/967

Incorporated fix: https://github.com/aurelia/cli/issues/966

Incorporated fix from here: https://github.com/aurelia/cli/issues/956

TODO: Fix the broken karma tests, they work in the skeleton-typescript-webpack configuration(despite at-loader errors showing) but not in this. Note: at-loader  is not used in the CLI generated config.

Refer to the build notes at the bottom of this readme for more details

## Running and building

#### Run in dev mode

Builds the app and then launches

```au run```

or

```npm start```

Launches in Watch mode (Watches source files for changes and refreshes the bundles automatically)

```au run --watch```

or launch in Hot Module Reload mode

```au run --watch --hmr```

Note: The Font Awesome spinner on the splash screen that appears while Aurelia is loading in the browser does not appear in dev mode because the CSS is concatenated and added added inline with the index.html page for performance reasons.
The Webpack extractCss plugin needs to be used which is the default in production mode to separate out the CSS.
https://github.com/aurelia/skeleton-navigation/issues/855

Run in dev mode with extractCss plugin to disable inline css used in dev mode:

```npm start -- webpack.server.extractCss```

#### Analyze in dev mode

```au run --analyze```

opens up the Webpack Bundler Analyzer, giving a visualization of the bundle contents.


#### Build in production mode:

```au build --env prod```

output will end up in the dist folder, everything you need to deploy can be found in the dist folder. Just copy this to the webserver and you'll be good to go.

#### Run in production mode:

```au run --env prod```

or

```au run --watch --env prod```

or

```npm start -- build```

```npm start -- serve```

#### Analyze in production mode

```au run --analyze --env prod```

## Testing

This skeleton provides three frameworks for running tests. You can choose one or two and remove the other, or even use all of them for different types of tests. By default, both Jest and Karma are configured to run the same tests with Jest's matchers (see Jest documentation for more information).

If you wish to only run certain tests under one of the runners, wrap them in an `if`, like this:

```js
if (jest) {
  // since only jest supports creating snapshot:
  it('should render correctly', () => {
    expect(document.body.outerHTML).toMatchSnapshot();
  });
}
```

#### Jest + Jasmine 2

Jest is a powerful unit testing runner and framework.
It runs really fast, however the tests are run under NodeJS, not the browser.

```au jest```

```au jest watch```


#### Karma + Jasmine 2

Karma is also a powerful test runner, which by default runs in the browser. This means that whatever works in real browsers, should also work the same way in the unit tests. But it also means the framework is heavier to execute and not as lean to work with.

```au karma```

To run the Karma watcher (re-runs tests on changes), run:

```au karma --watch```

#### Protractor (E2E / integration tests)

Integration tests can be performed with [Protractor](http://angular.github.io/protractor/#/).

1. Place your E2E-Tests into the folder ```test/e2e``` and name them with the extension `.e2e.ts`.

2. Run the tests by invoking

```au protractor```


# Build Notes (steps followed to create this project)

#### Install the Aurelia CLI
```npm install aurelia-cli -g```

### Aurelia Project Creation and Configuration

created using aurelia-cli v1.0.0-beta.3

```au new```

Would you like to use the default setup or customize your choices? 3. Custom

Which module loader / bundler would you like to use? 1. Webpack (default)

What platform are you targeting? 1. Web (Default)

What transpiler would you like to use? 2. TypeScript

How would you like to setup your template? 2. Minimum Minification

What css processor would you like to use? 3. Sass

Which unit test runners would you like to use? Karma Jest

Would you like to configure integration testing? 2. Protractor

What is your default code editor? 1. Visual Studio Code (Default)

Would you like to create this project? 1. Yes (Default)

Would you like to install the project dependencies? 2. Yes, use NPM


### Update the ClientApp dir

Add files from the 'src' and 'test' dir's from the Aurelia Skeleton Navigation repo to the  project generated by the CLI. (overwrite all apart from keep the existing main.ts file and just add the required css imports)


### Install additional packages:

```
additional packages installed:

  npm install aurelia-fetch-client@latest
  npm install bootstrap@latest
  npm install font-awesome@latest
  npm install isomorphic-fetch@latest
  npm install jquery@latest
  npm install popper.js@latest
  npm install optimize-css-assets-webpack-plugin --save-dev

  npm install --save @types/jquery
  npm install --save @types/bootstrap
  ```

Fix npm warnings:
```
npm install karma-webpack@next --save-dev
npm install ajv@6 --save-dev
```

### Update Webpack configuration

To enable jquery support in bootstrap (to make the small screen hamburger menu work), make the following changes to webpack.conf.js as detailed in this issue that i logged:

https://github.com/aurelia/cli/issues/958

Below the line commented by `// use Bluebird as the global Promise implementation:` Add:

```
// exposes jQuery globally as $ and as jQuery:
{ test: require.resolve('jquery'), loader: 'expose-loader?$!expose-loader?jQuery' },
```

Replace the section:

```
new ProvidePlugin({
  'Promise': 'bluebird'
}),
```

with:

```
new ProvidePlugin({
  'Promise': 'bluebird',
  '$': 'jquery',
  'jQuery': 'jquery',
  'window.jQuery': 'jquery',
  Popper: ['popper.js', 'default'] // Bootstrap 4 Dependency.
}),
```

### Adding support for bootstrap customisation and compilation

Refer to the sass dir added in this project


#### Install additional required packages to support bootstrap compilation

```
  npm install exports-loader autoprefixer postcss-loader --save-dev
```

Edit main.ts to reference sass/bootstrap and sass/app.scss

Update webpack.config.js as detailed in the documentation:

https://getbootstrap.com/docs/4.0/getting-started/webpack/

https://getbootstrap.com/docs/4.0/getting-started/theming/

### Other webpack config changes

Further split out the vendor bundle to obtain smaller bundle file sizes

Add optimize-css-assets-webpack-plugin to minimize css for production builds.

Excluded styles.css from CopyWebpackPlugin as this is already pulled in to the bundle by the css rules

Updated bundle naming conventions

Modified aurelia_project/tasks/build.ts to allow --extractCss to be used on the CLI commandline






