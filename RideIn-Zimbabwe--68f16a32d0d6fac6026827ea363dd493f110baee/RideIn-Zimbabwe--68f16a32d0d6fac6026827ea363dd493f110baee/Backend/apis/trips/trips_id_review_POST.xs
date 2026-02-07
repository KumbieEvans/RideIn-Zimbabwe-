// Submit a review for a completed trip, update driver rating, and manage favorites.
query "trips/id/review" verb=POST {
  api_group = "Trips"

  input {
    // The ID of the trip being reviewed
    int trip_id {
      table = "trips"
    }
  
    // Rating value between 1 and 5
    decimal rating filters=min:1|max:5
  
    // Optional tags describing the experience
    text tags?
  
    // Optional written comment
    text comment?
  
    // Whether to add the driver to favorites
    bool is_favorite?
  }

  stack {
    // Fetch the trip record to validate status and participants
    db.get trips {
      field_name = "id"
      field_value = $input.trip_id
    } as $trip
  
    // Ensure the trip exists and the authenticated user is the rider
    precondition ($trip != null && $trip.rider_id == $auth.id) {
      error_type = "accessdenied"
      error = "Trip not found or you are not authorized to review this trip."
    }
  
    // Ensure the trip is completed before allowing a review
    precondition ($trip.status == "COMPLETED") {
      error_type = "inputerror"
      error = "Reviews can only be submitted for completed trips."
    }
  
    // Check if a review already exists for this trip
    db.has reviews {
      field_name = "trip_id"
      field_value = $input.trip_id
    } as $review_exists
  
    precondition ($review_exists == false) {
      error_type = "inputerror"
      error = "A review for this trip already exists."
    }
  
    // Insert the new review record
    db.add reviews {
      data = {
        trip_id    : $input.trip_id
        reviewer_id: $auth.id
        reviewee_id: $trip.driver_id
        rating     : $input.rating|to_text
        tags       : $input.tags
        comment    : $input.comment
        is_favorite: $input.is_favorite|to_text
        created_at : "now"
      }
    } as $new_review
  
    // Calculate the new average rating for the driver
    db.query reviews {
      where = $db.reviews.reviewee_id == $trip.driver_id
      return = {type: "list"}
    } as $driver_reviews
  
    var $total_rating {
      value = 0
    }
  
    var $review_count {
      value = 0
    }
  
    foreach ($driver_reviews) {
      each as $review {
        var.update $total_rating {
          value = $total_rating + ($review.rating|to_decimal)
        }
      
        var.update $review_count {
          value = $review_count + 1
        }
      }
    }
  
    var $average_rating {
      value = ($review_count > 0) ? ($total_rating / $review_count) : 0
    }
  
    // Update the driver's rating in the users table
    db.edit users {
      field_name = "id"
      field_value = $trip.driver_id
      data = {rating: $average_rating|number_format:1:".":""}
    }
  
    // Manage Favorites: Add or Remove based on input
    conditional {
      if ($input.is_favorite) {
        // Check if already favorited to avoid duplicates
        db.query favorites {
          where = $db.favorites.user_id == $auth.id && $db.favorites.target_user_id == $trip.driver_id && $db.favorites.role_context == "driver"
          return = {type: "exists"}
        } as $is_already_fav
      
        conditional {
          if ($is_already_fav == false) {
            db.add favorites {
              data = {
                user_id       : $auth.id
                target_user_id: $trip.driver_id
                role_context  : "driver"
                created_at    : "now"
              }
            }
          }
        }
      }
    
      else {
        // Remove from favorites if it exists
        db.query favorites {
          where = $db.favorites.user_id == $auth.id && $db.favorites.target_user_id == $trip.driver_id && $db.favorites.role_context == "driver"
          return = {type: "single"}
        } as $fav_record
      
        conditional {
          if ($fav_record != null) {
            db.del favorites {
              field_name = "id"
              field_value = $fav_record.id
            }
          }
        }
      }
    }
  }

  response = {
    message  : "Review submitted successfully."
    review_id: $new_review.id
  }
}