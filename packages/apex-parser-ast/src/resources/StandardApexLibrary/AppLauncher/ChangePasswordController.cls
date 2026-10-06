/**
 * This class and its methods are for internal use only.
 */
global class ChangePasswordController {
    @AuraEnabled
    global static String changePassowrd(String newPassword, String confirmPassword, String oldPassword) { return null; }

    @AuraEnabled
    global static String changePassword(String newPassword, String confirmPassword, String oldPassword, Boolean shouldRedirect) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    @AuraEnabled
    global static String getPasswordPolicyStatement() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}