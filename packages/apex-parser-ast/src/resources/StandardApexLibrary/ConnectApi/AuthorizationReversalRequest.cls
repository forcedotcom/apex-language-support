/**
 * Authorization reversal input consumed by authorization reversal service.
 */
global class AuthorizationReversalRequest extends ConnectApi.BaseRequest {

  /**
   * Account for the payment authorization reversal. Must match the payment authorization's account.
   */
  global String accountId;

  /**
   * Amount of adjustment applied to the payment authorization.
   */
  global Double amount;

  /**
   * Users can add comments to provide additional details about a record. Maximum of 1,000 characters.
   */
  global String comments;

  /**
   * Date that the adjustment takes effect on the authorization.
   */
  global Datetime effectiveDate;

}