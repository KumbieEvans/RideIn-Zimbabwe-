// Retrieves the subscription status for the authenticated user.
query "driver/subscription" verb=GET {
  api_group = "Driver"
  auth = "users"

  input {
  }

  stack {
    // Fetch the subscription record for the authenticated user
    db.query subscriptions {
      where = $db.subscriptions.user_id == $auth.id
      return = {type: "single"}
    } as $subscription
  
    // Check if a subscription was found
    conditional {
      if ($subscription == null) {
        var $response {
          value = {
            status     : "no subscription"
            plan       : null
            expiry_date: null
          }
        }
      }
    
      else {
        var $response {
          value = {
            status     : $subscription.status
            plan       : $subscription.plan
            expiry_date: $subscription.expiry_date
          }
        }
      }
    }
  }

  response = $response[""]
}