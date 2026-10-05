/**
 * This class and its methods are for internal use only.
 */
global class EmployeeLoginLinkController {
    global EmployeeLoginLinkController() { }

    global virtual Boolean equals(Object o) { return false; }

    @AuraEnabled
    global static String getEmployeeLoginUrl(String startUrl) { return null; }

    @AuraEnabled
    global static Boolean getIsAllowInternalUserLoginEnabled() { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}