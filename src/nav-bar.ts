import { autoinject, LogManager, bindable } from 'aurelia-framework';
import { Router } from 'aurelia-router';

const logger = LogManager.getLogger('nav-bar');
logger.debug('loaded');

@autoinject
export class NavBar {
  @bindable router: Router;

  constructor() {
    // make the collapsed menu hide when clicking a link
    $(document).on('click', '.navbar-collapse.show', function (e) {
      if ($(e.target).is('a')) {
        $(".navbar-collapse").collapse('hide');
      }
    });
  }
}
