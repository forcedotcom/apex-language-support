/**
 * This class and its methods are for internal use only.
 */
global class LoginFormController {
    global virtual Boolean equals(Object o) { return false; }

    @AuraEnabled
    global static String getForgotPasswordUrl() { return null; }

    @AuraEnabled
    global static Boolean getIsSelfRegistrationEnabled() { return false; }

    @AuraEnabled
    global static Boolean getIsUsernamePasswordEnabled() { return false; }

    @AuraEnabled
    global static String getLoginRightFrameUrl() { return null; }

    @AuraEnabled
    global static String getSelfRegistrationUrl() { return null; }

    @AuraEnabled
    global static Map getUsernamePasswordSelfRegEnabled() { return null; }

    global virtual Integer hashCode() { return 0; }

    @AuraEnabled
    global static String login(String username, String password, String startUrl) { return null; }

    @AuraEnabled
    global static String loginGetPageRefUrl(String username, String password, String startUrl) { return null; }

    @AuraEnabled
    global static String setExperienceId(String expId) { return null; }

    global override virtual String toString() { return null; }
}