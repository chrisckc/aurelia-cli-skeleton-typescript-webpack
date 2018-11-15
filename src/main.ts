/// <reference types="aurelia-loader-webpack/src/webpack-hot-interface"/>

// we want font-awesome to load as soon as possible to show the fa-spinner
import 'font-awesome/css/font-awesome.css';

//import 'bootstrap/dist/css/bootstrap.css'; // do this if not using sass

// Bootstrap v4 is imported using Sass via bootstrap.scss to allow for customisation
// The bootstrap.scss and app.scss are kept separate and imported separately here
// this makes it easy to configure webpack to place the bootstrap css in a separate chunk from the app css
//import 'assets/sass/bootstrap/bootstrap.scss';
import 'assets/sass/bootstrap/bootstrap-base.scss';
import 'assets/sass/bootstrap/bootstrap-extra.scss';

import 'assets/sass/app.scss';
import 'assets/styles.css'; // we want our styles added last

// Allows the Bootstrap jQuery Extensions to be used in code
//import 'bootstrap'; // Dont' import all of the bootstrap js unless using all of it
import 'bootstrap/js/dist/collapse';

import {Aurelia} from 'aurelia-framework'
import environment from './environment';
import {PLATFORM} from 'aurelia-pal';
import * as Bluebird from 'bluebird';

// remove out if you don't want a Promise polyfill (remove also from webpack.config.js)
Bluebird.config({ warnings: { wForgottenReturn: false } });

export async function configure(aurelia: Aurelia) {
  aurelia.use
    .standardConfiguration()
    .feature(PLATFORM.moduleName('resources/index'));

  // Uncomment the line below to enable animation.
  // aurelia.use.plugin(PLATFORM.moduleName('aurelia-animator-css'));
  // if the css animator is enabled, add swap-order="after" to all router-view elements

  // Anyone wanting to use HTMLImports to load views, will need to install the following plugin.
  // aurelia.use.plugin(PLATFORM.moduleName('aurelia-html-import-template-loader'));

  aurelia.use.developmentLogging(environment.debug ? 'debug' : 'warn');

  if (environment.testing) {
    aurelia.use.plugin(PLATFORM.moduleName('aurelia-testing'));
  }

  await aurelia.start();
  await aurelia.setRoot(PLATFORM.moduleName('app'));
}
