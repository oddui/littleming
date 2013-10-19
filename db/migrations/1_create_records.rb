Sequel.migration do
  change do
    create_table(:records) do
      primary_key :id
      text :user_inputs
      text :user_agent
      text :from_url
      text :ip
      timestamp :recorded_at
    end
  end
end
