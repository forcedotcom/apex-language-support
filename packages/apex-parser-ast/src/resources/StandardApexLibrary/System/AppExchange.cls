global class AppExchange {
    global Object AppExchange() { return null; }

    global static void calculateListingPopularity(String testUserName, String testCronString) { }

    global static String createOrg(String firstName, String lastName, String companyName, String email, String language, String adminUserName, String packageId, String evalUserName, Boolean isExtension) { return null; }

    global static String createOrg(String firstName, String lastName, String companyName, String email, String language, String adminUserName, String packageId, String evalUserName, Boolean isExtension, String trialTemplateId) { return null; }

    global static Id createPortalUser(SObject user, String accountId) { return null; }

    global static String createSession(String appExchangeOrgId, String portalId, String siteId, String portalUserId) { return null; }

    global static void debug(String message) { }

    global virtual Boolean equals(Object o) { return false; }

    global static System.AppExchangeUserPerms getAppExchangeUserPerms(String orgId, String userId) { return null; }

    global static Map getAppInstallCountForPackageIds(Set packageIds, Date createdOnOrAfter) { return null; }

    global static String getAuthenticatingUrl(String page) { return null; }

    global static String getConfig(String section, String key) { return null; }

    global static String getCookie(String name) { return null; }

    global static String getCrossInstanceEncryptedHash(Double appVersion, String value) { return null; }

    global static List getInstalledPackageVersions(String orgId) { return null; }

    global static String getOrgName(String orgId) { return null; }

    global static String getPackageManifest(String pkgVersionId) { return null; }

    global static String getPortalAdminId() { return null; }

    global static String getPortalId() { return null; }

    global static String getSiteId() { return null; }

    global static List getTrialTemplates(String callerOrgId, String lmPkgId, String username) { return null; }

    global static List getTrialTemplatesInOrg(String tsoOrgId) { return null; }

    global static List getTrialTemplatesInTSOOrg(String tsoOrgId) { return null; }

    global virtual Integer hashCode() { return 0; }

    global static Boolean isDuplicateUserName(String username) { return false; }

    global static Boolean isGuestUser() { return false; }

    global static Boolean isTSOApproved(String ttId) { return false; }

    global static void movedPermanently(String location) { }

    global static String provisionPackageLicense(String orgId, String allPackageId, Integer numLicenses, Date expirationDate, String status) { return null; }

    global static Boolean registerPackageVersion(String pkgVersionId) { return false; }

    global static void setCookie(String name, String value) { }

    global static void setCookie(String name, String value, String cookieDomainName, Integer cookieAge) { }

    global static void setDefaultLicenseTerms(String pkgVersionId, String orgId, String defaultLicenseStatus, Integer defaultLicenseLength, Integer defaultLicenseSeats) { }

    global static void setHttpResponseStatus(Integer statusCode) { }

    global static String setLicenseManagementOrganization(String pkgVersionId, String orgId, String username, String password) { return null; }

    global static void splunkLog(System.Type logSource, String message) { }

    global static void stopListingPopularityJob() { }

    global static String to15(String id) { return null; }

    global static String to18(String id) { return null; }

    global override virtual String toString() { return null; }

    global static void updateSecurityInstallWarningFlag(List packageVersionIdsToSet, List packageVersionIdsToRevoke) { }

    global static Database.SaveResult updateSingleAsAdmin(SObject sobj) { return null; }

    global static String validateLMAInstalled(String username, String password) { return null; }

    global static String validateOrgUser(String username, String password) { return null; }
}