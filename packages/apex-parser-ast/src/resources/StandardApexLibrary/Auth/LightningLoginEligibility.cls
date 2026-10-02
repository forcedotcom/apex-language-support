/**
 * Contains a Lightning Login eligibility value used by the Auth.SessionManagement.getLightningLoginEligibility method.
 * <p>Usage
 * If you use the Discovery page type, users can verify themselves with Lightning Login. Lightning Login lets internal users log in with Salesforce Authenticator instead of a password. Certain conditions must be met for Lightning Login to succeed.
 * Call Auth.SessionManagement.getLightningLoginEligibility before or after a login attempt to get the eligibility status. You can call after a login attempt to determine why the login attempt failed.
 * <p>Enum Values
 * The following are the values of the Auth.LightningLoginEligibility enum.
 */
global enum LightningLoginEligibility {
    ELIGIBLE,
    ORG_AUTHENTICATOR_NOT_ENABLED,
    ORG_PREF_NOT_ENABLED,
    USER_AUTHENTICATOR_NOT_CONNECTED,
    USER_NOT_ALLOWED,
    USER_NOT_ENROLLED,
    USER_PERM_NOT_ENABLED

}