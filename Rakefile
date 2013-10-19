namespace :bundler do
  task :setup do
    require 'rubygems'
    require 'bundler/setup'
  end
end

task :environment => 'bundler:setup' do |cmd, args|
  ENV['RACK_ENV'] = ENV['RACK_ENV'] || 'development'
end

namespace :server do
  namespace :db do
    require 'sequel'
    Sequel.extension :migration

    desc "connect to database"
    task :connect => :environment do |cmd, args|
      $DB = Sequel.connect("sqlite://db/#{ENV['RACK_ENV']}.db") if $DB.nil?
    end

    desc "Run database migrations"
    task :migrate => :connect do |cmd, args|
      Sequel::Migrator.apply($DB, 'db/migrations')
    end

    desc "Rollback the database"
    task :rollback => :connect do |cmd, args|
      version = (row = $DB[:schema_info].first) ? row[:version] : nil
      Sequel::Migrator.apply($DB, "db/migrations", version - 1)
    end

    desc "Nuke the database (drop all tables)"
    task :nuke => :connect do |cmd, args|
      $DB.tables.each do |table|
        $DB.run("DROP TABLE #{table}")
      end
    end

    desc "Reset the database"
    task :reset => [:nuke, :migrate]

    desc "Populate the development database with sample data"
    task :populate => :environment do |cmd, args|
      unless ENV['RACK_ENV'] == 'development'
        puts "Will not populate database in #{ENV['RACK_ENV']} mode"
        next
      end

      Rake::Task['server:db:reset'].invoke
      records = $DB.from(:records)
      records.insert(user_inputs: '{"1.text":{"name":"username","value":"user0"},"2.password":{"name":"password","value":"pass0"}}',
                     user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:23.0) Gecko/20100101 Firefox/23.0',
                     from_url: 'example.com',
                     ip: '10.0.0.1',
                     recorded_at: Time.now)
      records.insert(user_inputs: '{"1.text":{"name":"username","value":"user1"},"2.password":{"name":"password","value":"pass1"}}',
                     user_agent: 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.17 Safari/537.36',
                     from_url: 'home.me',
                     ip: '10.0.0.2',
                     recorded_at: Time.now)
    end
  end

  namespace :assets do
    require 'uglifier'

    path = 'public/javascripts/'
    client_name = 'application.js'

    task :clean do
      if File.exist?(path + client_name)
        File.unlink(path + client_name)
      end
    end

    task :compile => :clean do
      out = ''

      ['underscore.js', 'utils.js', 'knockout.js', 'date.extensions.js', 'records.js', 'bots.js', 'ui.js'].each do |file|
        out += File.read(path + file)
      end

      # uglify
      out = Uglifier.new(:output => {:comments => :none}).compile(out)

      # write to file
      File.open(path + client_name, 'a') { |file| file.write(out) }
    end
  end

  desc "Run the server"
  task :run => :environment do |cmd, args|
    if ENV['RACK_ENV'] == 'development'
      exec "ruby server.rb -o 0.0.0.0"
    elsif ENV['RACK_ENV'] == 'production'
      # set port number
      port = 5000
      # stop if already running
      %x{kill $(ps -ef | grep '[r]uby server.rb -p #{port}' | awk '{print $2}') 2> /dev/null}
      # run it in production
      %x{RACK_ENV=production nohup ruby server.rb -p #{port} >> log/production.#{Time.now.to_i}.log 2>&1 &}
    end
  end

  desc "Test server"
  task :test do |cmd, args|
    ENV['RACK_ENV'] = 'test'
    Rake::Task['server:db:reset'].invoke

    Dir.glob('./test/*_test.rb') { |f| require f }

    Rake::Task['server:db:reset'].invoke
  end
end

namespace :client do
  require 'uglifier'

  path = 'client/'
  client_name = 'client.user.js'

  task :clean do
    if File.exist?(path + client_name)
      File.unlink(path + client_name)
      puts 'client cleaned'
    end
  end

  task :compile => :clean do
    # concatenate
    out = ""

    #Dir[path + '*.js'].each do |file|
    # order is important
    ['client/underscore.js', 'client/utils.js', 'client/main.js'].each do |file|
      out += File.read(file)
    end

    # uglify
    out = Uglifier.new(:output => {:comments => :none}).compile(out)

    # write to file
    File.open(path + client_name, 'a') { |file| file.write(out) }

    puts 'client uglified'
  end
end
