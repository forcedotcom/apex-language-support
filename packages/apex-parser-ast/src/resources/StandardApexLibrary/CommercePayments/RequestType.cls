/**
 * Defines the type of payment transaction request made to the payment gateway.
 * Enum Values
 * The following are the values of the commercepayments.RequestType enum.
 */
global enum RequestType {
    AuthorizationReversal,
    Authorize,
    Capture,
    PostAuth,
    ReferencedRefund,
    Sale,
    Tokenize,
    UnreferencedRefund

}