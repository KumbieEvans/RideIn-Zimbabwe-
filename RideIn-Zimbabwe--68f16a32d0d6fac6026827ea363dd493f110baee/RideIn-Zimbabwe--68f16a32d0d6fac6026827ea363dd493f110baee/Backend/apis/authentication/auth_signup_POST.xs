// Register a new user with password validation.
query "auth/signup" verb=POST {
  api_group = "Authentication"

  input {
    // The user's full name.
    text name
  
    // The user's phone number.
    text phone
  
    // The user's password.
    password password
  }

  stack {
    // Validate the password input before creating the user
    // Password must be at least 8 characters long
    precondition (($input.password|strlen) >= 8) {
      error_type = "inputerror"
      error = "Password must be at least 8 characters long."
    }
  
    // Check if the user already exists
    db.get users {
      field_name = "phone"
      field_value = "$input.phone"
    } as $existing_user
  
    // Ensure the phone number is unique
    precondition ($existing_user == null) {
      error_type = "inputerror"
      error = "A user with this phone number already exists."
    }
  
    // Create the new user record
    db.add users {
      data = {
        name      : $input.name
        phone     : $input.phone
        password  : $input.password
        role      : "rider"
        created_at: "now"
      }
    } as $user
  
    // Generate an authentication token
    security.create_auth_token {
      table = "users"
      extras = {}
      expiration = 86400
      id = $user.id
    } as $auth_token
  }

  response = {auth_token: $auth_token, user: $user}
}