/**
 * Specifies the retry category.
 * Enum Values
 * The following are the values of the commercepayments.RetryCategory enum.
 */
global enum RetryCategory {
    CardLimit,
    GatewayConnection,
    PaymentInformation,
    PaymentProcessing,
    Security,
    Unknown

}