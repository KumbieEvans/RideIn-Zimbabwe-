table driver_locations {
  auth = false

  schema {
    int id
    text lat?
    text lng?
    text is_online?=false
    text last_updated?
    int driver_id? {
      table = "users"
    }
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {
      type : "btree|unique"
      field: [{name: "driver_id", op: "asc"}]
    }
    {
      type : "btree"
      field: [
        {name: "is_online", op: "asc"}
        {name: "lat", op: "asc"}
        {name: "lng", op: "asc"}
      ]
    }
  ]
}