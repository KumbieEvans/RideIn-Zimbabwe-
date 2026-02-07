// Removes a driver from the user's favorites list.
query "rider/favorites/id" verb=DELETE {
  api_group = "Rider"
  auth = "users"

  input {
    // The ID of the favorite relationship to be deleted.
    int favorite_id
  }

  stack {
    // Retrieve the favorite entry based on the provided favorite_id
    db.get favorites {
      field_name = "id"
      field_value = $input.favorite_id
    } as $favorite
  
    // Ensure the entry exists, belongs to the authenticated user, and is a driver favorite
    precondition ($favorite != null && $favorite.user_id == $auth.id && $favorite.role_context == "driver") {
      error_type = "accessdenied"
      error = "Favorite not found or access denied."
    }
  
    // Remove the favorite entry from the favorites table
    db.del favorites {
      field_name = "id"
      field_value = $input.favorite_id
    }
  }

  response = {success: true}
}