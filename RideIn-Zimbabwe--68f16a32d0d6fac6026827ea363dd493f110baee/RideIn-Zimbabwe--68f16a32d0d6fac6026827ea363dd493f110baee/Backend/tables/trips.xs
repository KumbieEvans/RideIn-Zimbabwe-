table trips {
  auth = false

  schema {
    int id
    text status?=PENDING
    text vehicle_type?
    text category?
    text pickup_lat?
    text pickup_lng?
    text pickup_address?
    text dropoff_lat?
    text dropoff_lng?
    text dropoff_address?
    text distance_km?
    text duration_mins?
    text proposed_price?
    text final_price?
    text scheduled_time?
    text is_guest_booking?=false
    text guest_name?
    text guest_phone?
    text item_description?
    text requires_assistance?=false
    text notes?
    text partner?
    text city?
    text created_at?
    text updated_at?
    text completed_at?
  
    // List of URLs or paths to photos of cargo for a trip.
    text[] cargo_photos? filters=trim
  
    // The user who initiated this trip.
    int rider_id? {
      table = "users"
    }
  
    // The user assigned as the driver for this trip.
    int driver_id? {
      table = "users"
    }
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "rider_id", op: "asc"}]}
    {type: "btree", field: [{name: "driver_id", op: "asc"}]}
    {type: "btree", field: [{name: "status", op: "asc"}]}
    {type: "btree", field: [{name: "city", op: "asc"}]}
    {
      type : "btree"
      field: [{name: "status", op: "asc"}, {name: "city", op: "asc"}]
    }
  ]
}