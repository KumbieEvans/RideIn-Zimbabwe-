table reviews {
  auth = false

  schema {
    int id
    text rating?
    text tags?
    text comment?
    text is_favorite?=false
    text created_at?
  
    // The trip being reviewed.
    int trip_id? {
      table = "trips"
    }
  
    // The user who wrote the review.
    int reviewer_id? {
      table = "users"
    }
  
    // The user who is being reviewed.
    int reviewee_id? {
      table = "users"
    }
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree|unique", field: [{name: "trip_id", op: "asc"}]}
    {type: "btree", field: [{name: "reviewee_id", op: "asc"}]}
  ]
}