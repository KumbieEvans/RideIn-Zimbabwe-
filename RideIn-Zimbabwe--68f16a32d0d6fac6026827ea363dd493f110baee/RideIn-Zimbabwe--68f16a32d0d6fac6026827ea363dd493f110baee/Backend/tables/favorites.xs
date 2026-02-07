table favorites {
  auth = false

  schema {
    int id
    text role_context?
    text created_at?
  
    // The user who added this favorite.
    int user_id? {
      table = "users"
    }
  
    // The user who is being favorited.
    int target_user_id? {
      table = "users"
    }
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {
      type : "btree|unique"
      field: [
        {name: "user_id", op: "asc"}
        {name: "target_user_id", op: "asc"}
        {name: "role_context", op: "asc"}
      ]
    }
    {type: "btree", field: [{name: "user_id", op: "asc"}]}
  ]
}