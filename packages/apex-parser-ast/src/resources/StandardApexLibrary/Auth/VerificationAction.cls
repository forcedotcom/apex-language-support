/**
 * Indicates the method that you use to send a one-time password (OTP) to a user during the headless passwordless login flow.
 * <p>Usage
 * Use this enum to specify the user's method of receiving a one-time password when you implement the Auth.HeadlessUserDiscoveryHandler interface.
 * <p>Enum Values
 * The following are the values of the Auth.VerificationAction enum.
 */
global enum VerificationAction {
    EMAIL,
    SMS

}