/**
 * Defines the gateway call status values in Salesforce based on the call status values that the payment gateway returned.
 * <p>Usage
 * Payment gateways can return many different responses. Salesforce maps these responses into one of seven possible Salesforce response values.
 * <p>Enum Values
 * The following are the values of the commercepayments.SalesforceResultCode enum.
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