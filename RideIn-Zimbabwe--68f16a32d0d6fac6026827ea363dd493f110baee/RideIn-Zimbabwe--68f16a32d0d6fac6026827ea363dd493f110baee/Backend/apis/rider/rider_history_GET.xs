// Retrieve paginated trip history for the authenticated rider
query "rider/history" verb=GET {
  api_group = "Rider"
  auth = "users"

  input {
    // Page number for pagination
    int page?=1
  
    // Number of items per page
    int limit?=20
  }

  stack {
    // Fetch trips for the current user with pagination
    db.query trips {
      where = $db.trips.rider_id == $auth.id
      sort = {trips.created_at: "desc"}
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit}
      }
    } as $trip_history
  }

  response = $trip_history
}