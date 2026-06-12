/**
 * Contains constructors and methods to retrieve the buyer groups associated with a user.
 */
global class BuyerGroupResponse {

  global BuyerGroupResponse(Set<String> buyerGroupIds) {}

  global Set<String> getBuyerGroupIds() {}

  global void setBuyerGroupIds(Set<String> buyerGroupIds) {}

  global void setError(String errorMessage, String localizedErrorMessage) {}

  global Object clone() {}

}