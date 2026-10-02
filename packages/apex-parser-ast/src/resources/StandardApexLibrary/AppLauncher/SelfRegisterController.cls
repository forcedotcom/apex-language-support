/**
 * This class and its methods are for internal use only.
 */
global class SelfRegisterController {
    global Object SelfRegisterController() { return null; }

    @AuraEnabled
    global static String commonSelfRegisterGetRedirectUrl(String firstname, String lastname, String email, String password, String confirmPassword, String accountId, String regConfirmUrl, String extraFields, String startUrl, Boolean includePassword, Boolean redirect, Boolean enableBuyer, String buyerParams) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    @AuraEnabled
    global static List getExtraFields(String extraFieldsFieldSet) { return null; }

    global virtual Integer hashCode() { return 0; }

    global static Boolean isValidPassword(String password, String confirmPassword) { return false; }

    @AuraEnabled
    global static String selfRegister(String firstname, String lastname, String email, String password, String confirmPassword, String accountId, String regConfirmUrl, String extraFields, String startUrl, Boolean includePassword) { return null; }

    @AuraEnabled
    global static String selfRegisterGetRedirectUrl(String firstname, String lastname, String email, String password, String confirmPassword, String accountId, String regConfirmUrl, String extraFields, String startUrl, Boolean includePassword, Boolean redirect) { return null; }

    @AuraEnabled
    global static String setExperienceId(String expId) { return null; }

    global override virtual String toString() { return null; }
}