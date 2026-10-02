global class PushUpgradeCustomizationRepository {
    global Object PushUpgradeCustomizationRepository() { return null; }

    global static String create(String packageId, String subscriberOrgId, Boolean customUpgradeAllowed, Integer expirationDays) { return null; }

    global static void deleteById(String id) { }

    global static void deleteByIndex(String packageId, String subscriberOrgId) { }

    global virtual Boolean equals(Object o) { return false; }

    global static Boolean getCustomUpgradeAllowedForId(String id) { return false; }

    global static Boolean getCustomUpgradeAllowedForIndex(String packageId, String subscriberOrgId) { return false; }

    global static System.CustomizationType getCustomUpgradeTypeForId(String id) { return null; }

    global static System.CustomizationType getCustomUpgradeTypeForIndex(String packageId, String subscriberOrgId) { return null; }

    global static String getCustomizationSummaryById(String id) { return null; }

    global static String getCustomizationSummaryByIndex(String packageId, String subscriberOrgId) { return null; }

    global static Integer getExpirationDaysForId(String id) { return 0; }

    global static Integer getExpirationDaysForIndex(String packageId, String subscriberOrgId) { return 0; }

    global static Datetime getPushUpgradeBlockInitiatedDateForId(String id) { return null; }

    global static Datetime getPushUpgradeBlockInitiatedDateForIndex(String packageId, String subscriberOrgId) { return null; }

    global virtual Integer hashCode() { return 0; }

    global static Boolean isBlockingCapabilityExpiredForId(String id) { return false; }

    global static Boolean isBlockingCapabilityExpiredForIndex(String packageId, String subscriberOrgId) { return false; }

    global static String listAllCustomizationSummaries() { return null; }

    global static void setCustomUpgradeAllowedForId(String id, Boolean customUpgradeAllowed, Integer expirationDays) { }

    global static void setCustomUpgradeAllowedForIndex(String packageId, String subscriberOrgId, Boolean customUpgradeAllowed, Integer expirationDays) { }

    global static void setExpirationDaysForId(String id, Integer expirationDays) { }

    global static void setExpirationDaysForIndex(String packageId, String subscriberOrgId, Integer expirationDays) { }

    global override virtual String toString() { return null; }
}