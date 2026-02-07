query "switch-role" verb=POST {
  api_group = "Authentication"
  auth = "users"

  input {
    // The desired role to switch to (e.g., 'rider', 'driver')
    text new_role filters=trim|lower
  }

  stack {
    // Retrieve the authenticated user's ID
    var $user_id {
      value = $auth.id
    }
  
    // Get the current user record
    db.get users {
      field_name = "id"
      field_value = $user_id
    } as $user
  
    // Precondition to ensure the user exists
    precondition ($user != null) {
      error_type = "accessdenied"
      error = "User not found."
    }
  
    // Validate the new_role input
    precondition ($input.new_role == "rider" || $input.new_role == "driver") {
      error_type = "inputerror"
      error = "Invalid role specified. Must be 'rider' or 'driver'."
    }
  
    // Prevent switching to the same role
    precondition ($user.role != $input.new_role) {
      error_type = "inputerror"
      error = "User is already in the requested role."
    }
  
    // Initialize variable for online status based on current status
    var $new_online_status {
      value = $user.is_online
    }
  
    // Conditional logic for role specific updates
    conditional {
      if ($input.new_role == "driver") {
        // If switching to driver, ensure driver profile exists and is approved
        precondition ($user.driver_profile_exists && $user.driver_approved) {
          error_type = "accessdenied"
          error = "Driver profile not complete or not approved."
        }
      
        // Set driver status to online if switching to driver role
        var.update $new_online_status {
          value = true
        }
      }
    
      else {
        // If switching to rider, set online status to false
        var.update $new_online_status {
          value = false
        }
      }
    }
  
    // Update the user's role in the database
    db.edit users {
      field_name = "id"
      field_value = $user_id
      data = {role: $input.new_role, is_online: $new_online_status}
    } as $updated_user
  
    // Return the updated user's role and status
    var $response_data {
      value = {
        success     : true
        message     : "Role switched successfully to " ~ $input.new_role
        current_role: $updated_user.role
        is_online   : $updated_user.is_online
      }
    }
  }

  response = $response_data
}