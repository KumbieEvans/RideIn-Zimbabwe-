table users {
  auth = true

  schema {
    int id
    text name?
    text phone?
    text password?
    text role?=rider
    text city?=Harare
    text gender?
    text age?
    text marital_status?
    text religion?
    text personality?
    text rating?="5.0"
    text trips_count?
    text is_online?=false
    text avatar?
    text years_experience?
    text driver_profile_exists?=false
    text driver_verified?=false
    text driver_approved?=false
    text driver_status?
    text force_rider_mode?=false
    text account_status?=active
    text created_at?
  
    // List of service areas a user operates in.
    text[] service_areas? filters=trim
  
    // Timestamp of when the user record was created (auto-generated).
    timestamp created_at?
  
    // Timestamp of when the user record was last updated (auto-updated).
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
  ]
}