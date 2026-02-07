// Calculates total earnings, trip count, and average earnings per trip for the authenticated driver, with optional date filtering.
query "driver/earnings" verb=GET {
  api_group = "Driver"
  auth = "users"

  input {
    // Optional start date filter
    timestamp start_date?
  
    // Optional end date filter
    timestamp end_date?
  }

  stack {
    // Fetch completed trips for the driver within the date range
    db.query trips {
      where = $db.trips.driver_id == $auth.id && $db.trips.status == "COMPLETED" && $db.trips.completed_at >=? $input.start_date && $db.trips.completed_at <=? $input.end_date
      return = {type: "list"}
    } as $completed_trips
  
    var $total_earnings {
      value = 0
    }
  
    var $trips_count {
      value = $completed_trips|count
    }
  
    foreach ($completed_trips) {
      each as $trip {
        var.update $total_earnings {
          value = $total_earnings + ($trip.final_price|to_decimal)
        }
      }
    }
  
    var $average_per_trip {
      value = 0
    }
  
    conditional {
      if ($trips_count > 0) {
        var.update $average_per_trip {
          value = $total_earnings / $trips_count
        }
      }
    }
  }

  response = {
    total_earnings  : $total_earnings
    trips_count     : $trips_count
    average_per_trip: $average_per_trip
  }
}