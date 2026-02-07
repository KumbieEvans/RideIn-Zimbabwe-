table subscriptions {
  auth = false

  schema {
    int id
    text status?=expired
    text plan?
    text expiry_date?
    text created_at?
    text updated_at?
    int user_id? {
      table = "users"
    }
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree|unique", field: [{name: "user_id", op: "asc"}]}
    {type: "btree", field: [{name: "expiry_date", op: "asc"}]}
  ]
}