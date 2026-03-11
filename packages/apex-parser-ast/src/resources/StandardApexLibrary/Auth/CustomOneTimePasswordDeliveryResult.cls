/**
 * Indicates the status of an attempt to send a one-time password (OTP) to an external user via a custom messaging provider.
 */
global enum CustomOneTimePasswordDeliveryResult {
  COUNTRY_BLOCK,
  EXCEPTION,
  INVALID_PHONE_NUMBER,
  MESSAGE_LIMIT_EXCEEDED,
  PROVIDER_ERROR,
  SUCCESS
}