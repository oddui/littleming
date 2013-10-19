(function () {
  'use strict';

  if (window.location.pathname !== '/bots') {
    // return if it is not the bots page
    return;
  }

  var $ = utils();

  var controlPanelHeader = $('#control-panel>.panel-heading')[0];

  var createEvent = function (command, input) {
    var event = 'eval', data;

    switch (command) {
      case 'disconnect':
        event = 'disconnect';
        break;
      case 'back':
        data = 'window.history.back();';
        break;
      case 'forward':
        data = 'window.history.forward();';
        break;
      case 'goto':
        data = 'window.location.href="' + input +'";';
        break;
      case 'eval':
        data = input;
        break;
      default:
        event = 'unknown';
    }

    if (event === 'eval') {
      data = '(function(){' +  data + '})();';
    }

    return {
      event : event,
      data  : data
    };
  };

  $('#control-panel button').each(function(buttonEl) {

    var command = buttonEl.id,
    inputEl = $('input', buttonEl.parentNode)[0];

    buttonEl.addEventListener('click', function(e) {
      if ($.hasClass(buttonEl, 'btn-danger')) {
        var confirmed = window.confirm('Are you sure?');
      }
      var input = _(inputEl).isUndefined() ? '' : inputEl.value;
      if ((_(confirmed).isUndefined() ? true : confirmed)) {
        $.post('/bots/command', createEvent(command, input), function(response) {
          controlPanelHeader.innerHTML = response;
        }, {accept: 'text'});
      }
    });
  });
})();
