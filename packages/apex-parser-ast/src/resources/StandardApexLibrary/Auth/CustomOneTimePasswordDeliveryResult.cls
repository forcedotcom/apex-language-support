/**
 * Indicates the status of an attempt to send a one-time password (OTP) to an external user via a custom messaging provider.
 * Usage
 * To use this feature, contact Salesforce Customer Support.
 * This enum specifies the result of the sendOneTimePassword method in an implementation of the Auth.CustomOneTimePasswordDeliveryHandler interface.
 * Enum Values
 * The following are the values of the Auth.CustomOneTimePasswordDeliveryResult enum.
 */
global enum CustomOneTimePasswordDeliveryResult {
    COUNTRY_BLOCK,
    EXCEPTION,
    INVALID_PHONE_NUMBER,
    MESSAGE_LIMIT_EXCEEDED,
    PROVIDER_ERROR,
    SUCCESS

}