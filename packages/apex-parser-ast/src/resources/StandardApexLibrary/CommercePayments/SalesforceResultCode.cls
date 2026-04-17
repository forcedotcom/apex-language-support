/**
 * Defines the gateway call status values in Salesforce based on the call status values that the payment gateway returned.
 */
global enum SalesforceResultCode {
  Decline,
  Indeterminate,
  PermanentFail,
  RequiresReview,
  Success,
  SystemError,
  ValidationError
}