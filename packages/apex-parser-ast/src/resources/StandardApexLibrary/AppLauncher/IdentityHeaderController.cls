/**
 * This class and its methods are for internal use only.
 */
global class IdentityHeaderController {
    global virtual Boolean equals(Object o) { return false; }

    @AuraEnabled
    global static Boolean getGuestUser() { return false; }

    @AuraEnabled
    global static Boolean getInternalUser() { return false; }

    @AuraEnabled
    global static String getLoginUrl() { return null; }

    @AuraEnabled
    global static String getLogoutUrl() { return null; }

    @AuraEnabled
    global static String getPhotoUrl() { return null; }

    @AuraEnabled
    global static String getUserDisplayName() { return null; }

    @AuraEnabled
    global static String getUserId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}