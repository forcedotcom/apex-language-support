/**
 * This class and its methods are for internal use only.
 */
global class ForgotPasswordController {
    global virtual Boolean equals(Object o) { return false; }

    @AuraEnabled
    global static String forgotPassword(String username, String checkEmailUrl) { return null; }

    global virtual Integer hashCode() { return 0; }

    @AuraEnabled
    global static String setExperienceId(String expId) { return null; }

    global override virtual String toString() { return null; }
}