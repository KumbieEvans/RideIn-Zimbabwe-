// Fetch favorite drivers for the authenticated user
query "rider/favorites" verb=GET {
  api_group = "Rider"
  auth = "users"

  input {
  }

  stack {
    db.query favorites {
      join = {
        target_user: {
          table: "users"
          where: $db.favorites.target_user_id == $db.users.id
        }
      }
    
      where = $db.favorites.user_id == $auth.id && $db.favorites.role_context == "driver"
      eval = {driver: $db.{}}
      return = {type: "list"}
    } as $favorites
  }

  response = $favorites
}