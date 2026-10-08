/**
 * Contains the result of a verification challenge that you invoke when you create your own Verify page. The challenge can be initiated by either the System.UserManagement.verifyPasswordlessLogin or System.UserManagement.verifySelfRegistration method.
 * Usage
 * When users sign up for or log in to your Experience Cloud site with an email address or phone number, Salesforce sends them a verification code. At the same time, Salesforce generates the Verify page for users to enter the code to verify their identity. You can replace the Salesforce-generated Verify page with one that you create with Visualforce. Then invoke the verification challenge and, if the verification code is entered correctly, log in the user. For sign-up, you use the System.UserManagement.verifySelfRegistration method. For passwordless login, you use the System.UserManagement.verifyPasswordlessLogin method. The methods return the verification result, which contains the message displayed as a result of the challenge. This message also indicates whether the challenge is successful and where to direct the user when the verification code is entered correctly.
 * Example
 * This code contains the result of a verification challenge that registers a new user.
 * String id = System.UserManagement.initSelfRegistration
 *           (Auth.VerificationMethod.SMS, user);
 *         Auth.VerificationResult res = System.UserManagement.verifySelfRegistration
 *           (Auth.VerificationMethod.SMS, id, ‘123456’, null);
 *         if(res.success == true){
 *      //redirect
 * }
 */
global class VerificationResult {
    /**
     * Message that displays as a result of a verification challenge. Token is valid if the identity verification is successful. Other values are FAILURE, PENDING, RATE_LIMITED, or FAILURE_REPORT.
     * String
     */
    global String message { get; set; }
    /**
     * Where the user is directed after entering the verification code successfully, for example, the Experience Cloud site’s home page or location specified by the start URL.
     * System.PageReferenceSystem.PageReference
     */
    global System.PageReference redirect { get; set; }
    /**
     * The verification challenge is successful.
     * Boolean
     */
    global Boolean success { get; set; }

    /**
     * Creates an instance of the VerificationResult class that contains the verification result from System.UserManagement.verifySelfRegistration.
     */
    global VerificationResult(System.PageReference redirect, Boolean success, String message) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}