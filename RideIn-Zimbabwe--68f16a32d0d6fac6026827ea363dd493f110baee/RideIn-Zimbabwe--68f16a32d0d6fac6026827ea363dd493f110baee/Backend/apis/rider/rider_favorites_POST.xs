// Add favorite driver
query "rider/favorites" verb=POST {
  api_group = "Rider"
  auth = "users"

  input {
    // The ID of the driver to favorite
    int target_user_id {
      table = "users"
    }
  
    // Context of the relationship
    text role_context?="rider_to_driver"
  }

  stack {
    db.add favorites {
      data = {
        user_id       : $auth.id
        target_user_id: $input.target_user_id
        role_context  : $input.role_context
        created_at    : "now"
      }
    } as $favorite
  }

  response = $favorite
}