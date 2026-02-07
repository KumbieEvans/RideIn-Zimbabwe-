table vehicles {
  auth = false

  schema {
    int id
    text type?
    text category?
    text make?
    text model?
    text year?
    text plate_number?
    text color?
    text created_at?
    text updated_at?
  
    // List of URLs or paths to vehicle photos.
    text[] photos? filters=trim
  
    // The user who owns this vehicle.
    int user_id? {
      table = "users"
    }
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree|unique", field: [{name: "user_id", op: "asc"}]}
    {
      type : "btree|unique"
      field: [{name: "plate_number", op: "asc"}]
    }
  ]
}