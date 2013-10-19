/**
 * utils.js
 *
 * Super small javascript library that simplifies HTML document traversing,
 * event handling, ajax interactions and provides other functional utilities.
 *
 * utils.js depends on underscore.js
 *
 * Released under the MIT and GPL Licenses.
 *
 * ------------------------------------------------
 * author: Ziyu Wang
 * source: http://github.com/oddui/util.js/
 */

var utils = function () {
  'use strict';

  // base object
  var $ = (function () {

    // augmentations for element objects
    var aug = {};

    // getElements return an array of elements for given CSS selector in the
    // context of the given element or whole document.
    var getElements = function ( selector, context ) {
      context = context || document;
      return $.arrayify( context.querySelectorAll(selector) );
    };

    // this is the base object which is a function that returns an array of matching
    // elements. The returned array is augmented with methods from aug object.
    // I call the returned object as utils.js dom object.
    var $ = function (selector, context) {
      var elements;

      if (selector.nodeType === 1) {
        // an element is passed in assign it to el directly
        elements = [selector];
      } else if ($.toType(selector) === 'array') {
        elements = selector;
      } else {
        elements = getElements( selector, context );
      }

      // put aug methods into elements
      // aug methods should only be called on a utils.js dom object.
      for (var prop in aug) {
        if (aug.hasOwnProperty(prop)) {
          elements[prop] = aug[prop];
        }
      }
      return elements;
    };

    $.aug = aug;

    return $;

  })();

  // common utils
  (function($) {

    // it's just an empty function ... and a useless comment.
    $.empty = function () { return false; };

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString#Using_toString_to_detect_object_type
    $.toType = function(obj) {
      return Object.prototype.toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
    };

    // takes an array-like object and turns it into real Array
    // to make all the Array.prototype goodness available.
    $.arrayify = function (a) {
      return [].slice.call(a);
    };

    // it will iterate through elements of the base object.
    // the element is passed as context in callback
    $.aug.each = function(callback) {
      _(this).each(function(element, index) {
        callback.call(element, element, index);
      });
      return this;
    };

    // produces a new utils.js object of elements by mapping
    // each element through a transformation function (callback)
    // the element is passed as context in callback
    $.aug.map = function(callback) {
      return $(_(this).map(function(element) {
        return callback.call(element, element);
      }));
    };

  })($);

  // query
  (function($) {

    $.aug.filter = function(selector) {
      return $([].filter.call(this, function(element) {
        return element.parentNode &&
          _(element.parentNode.querySelectorAll(selector)).contains(element);
      }));
    };

    $.aug.parent = function() {
      return this.map(function(element) {
        return element.parentNode;
      });
    };
  })($);

  // element
  (function($) {

    $.aug.remove = function() {
      return this.each(function() {
        if (this.parentNode !== null) {
          return this.parentNode.removeChild(this);
        }
      });
    };

  })($);

  // output
  (function($) {

    $.aug.append = function(value) {
      var type = $.toType(value);

      return this.each(function() {
        if (type === "string") {
          this.insertAdjacentHTML("beforeend", value);
        } else if (type === "array") {
          _(value).each(function(value, index) {
            //console.log(this);
            //console.log(value);
            this.appendChild(value);
          }, this);
        } else {
          this.appendChild(value);
        }
      });
    };

  })($);

  // styles
  (function($) {

    // `pfx` is a function that takes a standard CSS property name as a parameter
    // and returns it's prefixed version valid for current browser it runs in.
    // The code is heavily inspired by Modernizr http://www.modernizr.com/
    var pfx = (function () {

      var style = document.createElement('dummy').style,
      prefixes = 'Webkit Moz O ms Khtml'.split(' '),
      memory = {};

      return function ( prop ) {
        if ( typeof memory[ prop ] === "undefined" ) {

          var ucProp = prop.charAt(0).toUpperCase() + prop.substr(1),
          props = (prop + ' ' + prefixes.join(ucProp + ' ') + ucProp).split(' ');

          memory[ prop ] = null;
          for ( var i in props ) {
            if ( style[ props[i] ] !== undefined ) {
              memory[ prop ] = props[i];
              break;
            }
          }

        }
        return memory[ prop ];
      };

    })();

    // `css` function applies the styles given in `props` object to the element
    // given as `el`. It runs all property names through `pfx` function to make
    // sure proper prefixed version of the property is used.
    $.css = function ( el, props ) {
      var key, pkey;
      for ( key in props ) {
        if ( props.hasOwnProperty(key) ) {
          pkey = pfx(key);
          if ( pkey !== null ) {
            el.style[pkey] = props[key];
          }
        }
      }
      return el;
    };

    $.aug.css = function(props) {
      this.each(function() {
        $.css(this, props);
      });
      return this;
    };

    var hasClass = function(el, className) {
      var classes;

      classes = el.className.split(/\s+/g);
      return classes.indexOf(className) >= 0;
    };

    $.hasClass = hasClass;

    $.aug.addClass = function (name) {
      return this.each(function(el, index) {
        if (!hasClass(el, name)) {
          el.className += ' ' + name;
        }
      });
    };

    $.aug.removeClass = function (name) {
      return this.each(function(el, index) {
        if (_(name).isUndefined()) {
          el.className = '';
        } else if (hasClass(el, name)) {
          el.className = el.className.replace(name, " ").replace(/\s+/g, " ").trim();
        }
      });
    };

  })($);

  // events
  (function($) {
  })($);

  // ajax
  (function($) {
    var DEFAULT, MIME_TYPES, JSONP_ID;

    DEFAULT = {
      METHOD: "GET",
      ACCEPT: "json",
      CONTENT_TYPE: "urlencoded"
    };

    MIME_TYPES = {
      script: "text/javascript, application/javascript",
      json: "application/json",
      xml: "application/xml, text/xml",
      html: "text/html",
      text: "text/plain",
      urlencoded: "application/x-www-form-urlencoded"
    };

    JSONP_ID = 0;

    $.defaultOptions = {
      method: DEFAULT.METHOD,
      async: true,
      success: function(response, xhr, settings) { return false; },
      error: function(type, xhr, settings) { return false; },
      context: null,
      accept: DEFAULT.ACCEPT,
      contentType: DEFAULT.CONTENT_TYPE,
      headers: {},
      xhr: function() {
        return new window.XMLHttpRequest();
      },
      crossDomain: false,
      timeout: 0
    };

    // note: for get method, data is also sent in request http body
    // encoded according to contentType which is urlencoded by default.
    // this doesn't do any harm as the server will simply ignore the
    // request body
    $.ajax = function(options) {
      var abortTimeout, settings, xhr;

      // merge defaultOptions and options
      settings = _({}).extend($.defaultOptions, options);

      // jsonp
      if (isJsonP(settings.url)) {
        return $.jsonp(settings);
      }
      xhr = settings.xhr();
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          clearTimeout(abortTimeout);
          xhrStatus(xhr, settings);
        }
      };

      if (settings.method === 'GET') {
        settings.url += $.serializeParameters(settings.data, '?');
      }

      xhr.open(settings.method, settings.url, settings.async);
      xhrHeaders(xhr, settings);

      encodeRequestData(xhr, settings);

      abortTimeout = xhrTimeout(xhr, settings);
      try {
        xhr.send(settings.data);
      } catch (error) {
        xhrError("Resource not found", xhr, settings);
      }
      if (settings.async) {
        return xhr;
      } else {
        return parseResponse(xhr, settings);
      }
    };

    $.jsonp = function(settings) {
      var abortTimeout, callbackName, script, xhr;

      if (settings.async) {
        callbackName = "jsonp" + (++JSONP_ID);
        script = document.createElement("script");
        window[callbackName] = function(response) {
          clearTimeout(abortTimeout);
          $(script).remove();
          delete window[callbackName];
          xhrSuccess(response, null, settings);
        };
        script.src = settings.url.replace((new RegExp("=\\?")), "=" + callbackName);
        $("head").append(script);

        if (settings.timeout > 0) {
          abortTimeout = setTimeout((function() {
            $(script).remove();
            // once the user set timeout exceeds, the browser may possiblly
            // still receive the payload and interprete it. so instead of
            // removing the callback, set the callback as a dummy function
            // to avoid the function not defined error when timeout exceeds.
            window[callbackName] = function(response) { return false; };
            xhrError("ajax: Timeout exceeded", null, settings);
          }), settings.timeout);
        }

        return {
          scriptElement: script,
          callbackName: callbackName
        };
      } else {
        return console.error("ajax: Unable to make jsonp synchronous call.");
      }
    };

    var ajaxRequest = function(url, data, success, options) {
      options = _({
        url: url,
        data: data,
        success: success
      }).extend(options);

      return $.ajax(options);
    };

    $.get = function(url, data, success, options) {
      return ajaxRequest(url, data, success, options);
    };

    $.post = function(url, data, success, options) {
      options = _({ method: 'POST' }).extend(options);
      return ajaxRequest(url, data, success, options);
    };

    $.put = function(url, data, success, options) {
      options = _({ method: 'PUT' }).extend(options);
      return ajaxRequest(url, data, success, options);
    };

    $["delete"] = function(url, data, success, options) {
      options = _({ method: 'DELETE' }).extend(options);
      return ajaxRequest(url, data, success, options);
    };

    $.serializeParameters = function(parameters, character) {
      var parameter, serialize;

      if (_(character).isUndefined()) {
        character = "";
      }
      serialize = character;
      for (parameter in parameters) {
        if (parameters.hasOwnProperty(parameter)) {
          if (serialize !== character) {
            serialize += "&";
          }
          serialize += (encodeURIComponent(parameter)) + "=" + (encodeURIComponent(parameters[parameter]));
        }
      }
      return (serialize === character) ? "" : serialize;
    };

    var xhrSuccess = function(response, xhr, settings) {
      settings.success.call(settings.context, response, xhr, settings);
    };

    var xhrError = function(type, xhr, settings) {
      settings.error.call(settings.context, type, xhr, settings);
    };

    var xhrStatus = function(xhr, settings) {
      // should status 0 be considered as a successful status?
      //if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) {
      if ((xhr.status >= 200 && xhr.status < 300)) {
        if (settings.async) {
          xhrSuccess(parseResponse(xhr, settings), xhr, settings);
        }
      } else {
        xhrError("ajax: Unsuccessful request", xhr, settings);
      }
    };

    var xhrHeaders = function(xhr, settings) {
      // contentType and accept can be set in options or options.headers
      if (settings.contentType) {
        settings.headers["Content-Type"] = MIME_TYPES[settings.contentType] || settings.contentType;
      }
      if (settings.accept) {
        settings.headers.Accept = MIME_TYPES[settings.accept] || settings.accept;
      }

      for (var header in settings.headers) {
        xhr.setRequestHeader(header, settings.headers[header]);
      }
    };

    var xhrTimeout = function(xhr, settings) {
      if (settings.timeout > 0) {
        return setTimeout((function() {
          xhr.onreadystatechange = {};
          xhr.abort();
          xhrError("ajax: Timeout exceeded", xhr, settings);
        }), settings.timeout);
      }
    };

    // convert request data to Content-Type set in request header
    var encodeRequestData = function(xhr, settings) {
      switch (settings.headers['Content-Type']) {
        case MIME_TYPES.json:
          settings.data = JSON.stringify(settings.data);
          break;
        case MIME_TYPES.urlencoded:
          settings.data = $.serializeParameters(settings.data);
          break;
        default:
          settings.data = $.serializeParameters(settings.data);
      }
    };

    // parse xhr responseText according to accept specified in settings
    // this does not honor the Content-Type from the http response headers
    var parseResponse = function(xhr, settings) {
      var response = xhr.responseText;

      if (response) {
        if (settings.accept === 'json') {
          try {
            response = JSON.parse(response);
          } catch (error) {
            response = error;
            xhrError("ajax: Response parse error", xhr, settings);
          }
        } else if (settings.accept === 'xml') {
          response = xhr.responseXML;
        }
      }
      return response;
    };

    var isJsonP = function(url) {
      return (new RegExp("=\\?")).test(url);
    };

  })($);

  // environment
  (function($) {

    var IS_WEBKIT, IS_MOBILE, SUPPORTED_OS, env ;

    env = null;
    IS_WEBKIT = /WebKit\/([\d.]+)/;
    IS_MOBILE = /Mobile|Android|BlackBerry|(webOS|hpwOS)/;
    SUPPORTED_OS = {
      Android: /(Android)\s+([\d.]+)/,
      ipad: /(iPad).*OS\s([\d_]+)/,
      iphone: /(iPhone\sOS)\s([\d_]+)/,
      Blackberry: /(BlackBerry|BB10|Playbook).*Version\/([\d.]+)/,
      FirefoxOS: /(Mozilla).*Mobile[^\/]*\/([\d\.]*)/,
      webOS: /(webOS|hpwOS)[\s\/]([\d.]+)/
    };

    var detectBrowser = function(userAgent) {
      var is_webkit;

      is_webkit = userAgent.match(IS_WEBKIT);
      if (is_webkit) {
        return is_webkit[0];
      } else {
        return userAgent;
      }
    };

    var detectOS = function(userAgent) {
      var detected_os, os, supported;

      detected_os = null;
      for (os in SUPPORTED_OS) {
        supported = userAgent.match(SUPPORTED_OS[os]);
        if (supported) {
          detected_os = {
            name: (os === "iphone" || os === "ipad" ? "ios" : os),
            version: supported[2].replace("_", ".")
          };
          break;
        }
      }
      return detected_os;
    };

    var detectScreen = function() {
      return {
        width: window.innerWidth,
        height: window.innerHeight
      };
    };

    var detectEnvironment = function() {
      var env, userAgent;

      userAgent = navigator.userAgent;
      env = {};
      env.browser = detectBrowser(userAgent);
      env.os = detectOS(userAgent);
      env.screen = detectScreen();
      return env;
    };

    $.environment = function() {
      env = env || detectEnvironment();
      return env;
    };
    $.isMobile = function() {
      return IS_MOBILE.test(navigator.userAgent);
    };
    $.isTouchDevice = function () {
      return !!('ontouchstart' in window) || // works on most browsers
        !!('onmsgesturechange' in window); // works on ie10
    };
    $.isOnline = function() {
      return navigator.onLine;
    };
  })($);

  // test browser support
  (function($) {

    $.isSupported = (true) &&
      (true);

  })($);

  return $.isSupported ? $ : undefined;
};
