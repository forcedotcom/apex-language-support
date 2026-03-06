/**
 * Defines the type of payment transaction request made to the payment gateway.
 */
global enum RequestType {
  Authorize,
  PostAuth,
  Capture,
  AuthorizationReversal,
  ReferencedRefund,
  Sale,
  Tokenize
}