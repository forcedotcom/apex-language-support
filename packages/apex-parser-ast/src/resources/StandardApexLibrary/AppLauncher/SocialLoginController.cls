/**
 * This class and its methods are for internal use only.
 */
global class SocialLoginController {
    global Object SocialLoginController() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    @AuraEnabled
    global static List getAuthProviders() { return null; }

    @AuraEnabled
    global static String getCommunityDomainSsoUrl(String startUrl, String developerName) { return null; }

    @AuraEnabled
    global static List getSamlProviders() { return null; }

    @AuraEnabled
    global static String getSamlSsoUrl(String startUrl, String samlId) { return null; }

    @AuraEnabled
    global static String getSamlSsoUrlNoCache(String startUrl, String samlId) { return null; }

    @AuraEnabled
    global static String getSsoUrl(String startUrl, String developerName) { return null; }

    @AuraEnabled
    global static String handleIdp() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}