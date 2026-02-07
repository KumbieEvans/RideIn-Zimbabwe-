// Login and retrieve an authentication token
query "auth/login" verb=POST {
  api_group = "Authentication"

  input {
    text phone?
    text password?
  }

  stack {
    // Retrieve user by phone number, excluding email from the requested fields
    db.get users {
      field_name = "phone"
      field_value = $input.phone
      output = ["id", "created_at", "name", "password"]
    } as $users
  
    precondition ($users != null) {
      error = "Invalid Credentials."
    }
  
    security.check_password {
      text_password = $input.password
      hash_password = $users.password
    } as $pass_result
  
    precondition ($pass_result) {
      error = "Invalid Credentials."
    }
  
    security.create_auth_token {
      table = "users"
      extras = {}
      expiration = 86400
      id = $users.id
    } as $authToken
  }

  response = {authToken: $authToken}
}