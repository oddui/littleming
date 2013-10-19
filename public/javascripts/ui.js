// collapse navbar
(function () {
  var display = false,
  navbarEl = document.querySelector('.navbar');

  var toggle = function () {
    var navbarCollapseEl = navbarEl.querySelector('div.navbar-collapse');
    if (display) {
      navbarCollapseEl.style.display = 'none';
    } else {
      navbarCollapseEl.style.display = 'block';
    }
    display = !display;
  };
  navbarEl.querySelector('button.navbar-toggle').addEventListener('click', toggle);
})();
