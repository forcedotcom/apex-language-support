/**
 * Contains constructors and methods to retrieve the buyer groups associated with a user.
 */
global class BuyerGroupResponse {
    /**
     * Creates a new instance of the CommerceBuyGrp.BuyerGroupResponse class.
     */
    global BuyerGroupResponse() { }

    /**
     * Creates a new instance of the CommerceBuyGrp.BuyerGroupResponse class using the specified buyerGroupIds payload parameter.
     */
    global BuyerGroupResponse(Set buyerGroupIds) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Retrieves a list of evaluated buyer group IDs assigned to a user.
     */
    global Set getBuyerGroupIds() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets a list of evaluated buyer group IDs assigned to a user.
     */
    global void setBuyerGroupIds(Set buyerGroupIds) { }

    /**
     * Sets the error message to be returned when the evaluation of buyer group IDs fails.
     */
    global void setError(String errorMessage, String localizedErrorMessage) { }

    global override virtual String toString() { return null; }
}