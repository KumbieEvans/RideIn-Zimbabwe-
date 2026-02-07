table bids {
  auth = false

  schema {
    int id
    text offer_price?
    text status?=pending
    text created_at?
    text updated_at?
    int trip_id? {
      table = "trips"
    }
  
    int driver_id? {
      table = "users"
    }
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {
      type : "btree|unique"
      field: [{name: "trip_id", op: "asc"}, {name: "driver_id", op: "asc"}]
    }
    {type: "btree", field: [{name: "trip_id", op: "asc"}]}
    {type: "btree", field: [{name: "driver_id", op: "asc"}]}
  ]
}