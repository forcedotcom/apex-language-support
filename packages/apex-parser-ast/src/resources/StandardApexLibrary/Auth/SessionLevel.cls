/**
 * An Auth.SessionLevel enum value is used by the SessionManagement.setSessionLevel method.
 * <p>Enum Values
 * <p>Usage
 * With session-level security, you control user access to features that support it, such as connected apps and reporting. For example, you can customize an organization’s Session Settings to require users to log in with multi-factor authentication (MFA) to get a High Assurance session. Then, you can restrict access to a specific connected app by requiring a High Assurance session level in the settings for the connected app.
 */
global enum SessionLevel {
    HIGH_ASSURANCE,
    LOW,
    STANDARD

}