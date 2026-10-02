global class BlackTabFramework {
    global Object BlackTabFramework() { return null; }

    global static String cancelBlackTabRequest(String requestId, Set instances, Set orgs, String caseId, String userId) { return null; }

    global static String createChangeCases(String caseOwnerName, String subject, String description, String businessReason, String priority, String riskLevel, String riskSummary, String verificationAndMonitoring, String backoutPlan, String wasBackoutPlanTested, String canaryStaggerPlan, Set actionNames, String targetType, Set targets, Boolean isStaggerBypass, Date plannedStartTime, Double plannedDurationInHours, String caseOrigin) { return null; }

    global static String createChangeCases(String caseOwnerName, String subject, String description, String businessReason, String priority, String riskLevel, String riskSummary, String verificationAndMonitoring, String backoutPlan, String wasBackoutPlanTested, String canaryStaggerPlan, Set actionNames, String targetType, Set targets, Boolean isStaggerBypass, Date plannedStartTime, Double plannedDurationInHours, String caseOrigin, Set verificationTargets) { return null; }

    global static String createChangeCases(String caseOwnerName, String subject, String description, String businessReason, String priority, String riskLevel, String riskSummary, String verificationAndMonitoring, String backoutPlan, String wasBackoutPlanTested, String canaryStaggerPlan, String actionParameterJson, String targetType, Set targets, Boolean isStaggerBypass, Date plannedStartTime, Double plannedDurationInHours, String caseOrigin, Set verificationTargets) { return null; }

    global static String createChangeCases(String caseOwnerName, String subject, String description, String businessReason, String priority, String riskLevel, String riskSummary, String verificationAndMonitoring, String backoutPlan, String wasBackoutPlanTested, String canaryStaggerPlan, Set actionNames, String targetType, Set targets, Boolean isStaggerBypass, Date plannedStartTime, String plannedTimeValue, Double plannedDurationInHours, String caseOrigin, Set verificationTargets) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global static String executeAsyncAgentBlackTabRequest(String toolName, String parameters, String operation, Set instances, Set orgs, String caseId) { return null; }

    global static String executeAsyncOffPeakAgentBlackTabRequest(String toolName, String parameters, String operation, Set instances, Set orgs, String caseId) { return null; }

    global static String executeBlackTabRequest(String toolName, String parameters, String operation, Set instances, Set orgs) { return null; }

    global static String executeBlackTabRequest(String toolName, String parameters, String operation, Set instances, Set orgs, String caseId) { return null; }

    global static String executeBlackTabRequest(String toolName, String parameters, String operation, Set instances, Set orgs, String caseId, String scheduledTime) { return null; }

    global static String executeBlackTabRequest(String toolName, String parameters, String operation, Set instances, Set verifInstances, Set orgs, String caseId, String scheduledTime, String staggerInterval) { return null; }

    global static String executeBlackTabRequest(String toolName, String parameters, String operation, Set instances, Set verifInstances, Set orgs, String caseId, String scheduledTime, String staggerInterval, String userId) { return null; }

    global static String executeBlackTabRequest(String toolName, String parameters, String operation, Set instances, Set verifInstances, Set orgs, String caseId, String scheduledTime, String staggerInterval, String userId, String origin) { return null; }

    global static String executeBlackTabRequestOffPeakOverride(String toolName, String parameters, String operation, Set instances, Set orgs, String caseId) { return null; }

    global static String executeScrutinyRequest(String scrutinyName, String parameters, String operation, String org, String caseId) { return null; }

    global static String executeScrutinyRequest(String scrutinyName, String parameters, String operation, String org, String caseId, Boolean offPeakOverride) { return null; }

    global static String executeStaggeredBlackTabRequest(String toolName, String parameters, String operation, Set instances, Set verifInstances, Set orgs, Set verifOrgs, String caseId, String operationId, String staggerInterval, String userId, String origin, Boolean bypassStagger, String bypassReason) { return null; }

    global static String executeSyncAgentBlackTabRequest(String toolName, String parameters, String operation, Set instances, Set orgs, String caseId) { return null; }

    global static String executeSyncBlackTabRequest(String toolName, String parameters, String operation, Set instances, Set orgs, String caseId) { return null; }

    global static String generateBTUrlForOrg(Id caseId, Id orgId, String landingUrl) { return null; }

    global static String generateBTUrlForOrg(Id caseId, Id orgId, String landingUrl, String caseMember) { return null; }

    global static String getAllCategories() { return null; }

    global static String getAllNonProvisionedOrgPermissions() { return null; }

    global static String getAllOrgPermissions() { return null; }

    global static String getAllOrgPreferences() { return null; }

    global static String getAllOrgValues() { return null; }

    global static String getAllProvisionedOrgValues() { return null; }

    global static String getAllScrutinies() { return null; }

    global static String getAllScrutinies(String orgId, String caseId) { return null; }

    global static String getBatchToInstances(String actionName, String publicKeyPermissionsString, Set instances) { return null; }

    global static String getBlackTabActionListMetadata(String name, String owner, String category, String impact, String invocationScope, String publicKeyPermission) { return null; }

    global static String getBlackTabActionListMetadataFilterBySecDSPerms(String orgId, String userEmail, String publicKeyPermission) { return null; }

    global static String getBlackTabActionParameters(String name) { return null; }

    global static String getBlackTabActionParameters(String name, String publicKeyPermission, String targetOrgId) { return null; }

    global static String getBlackTabActionPrediction(String caseText) { return null; }

    global static List getCatalogMetadata() { return null; }

    global static String getCustomerOrgViewSetup(Id caseId, Id orgId, String userEmail) { return null; }

    global static String getCustomerOrgViewSetup(Id caseId, Id orgId, String userEmail, String caseMember) { return null; }

    global static String getCustomerOrgViewSetup(Id caseId, Id orgId, String userEmail, String caseMember, Boolean isReadOnly) { return null; }

    global static String getCustomerOrgViewSetup(Id caseId, Id orgId, String userEmail, String caseMember, Boolean isReadOnly, Boolean shouldUseQkBtServletEntry) { return null; }

    global static String getInstanceDetails(List instances) { return null; }

    global static String getLapBotGusSessionId() { return null; }

    global static String getLoginAsUrl(Id caseId, Id orgId, String impersonateUser) { return null; }

    global static String getLoginAsUrl(Id caseId, Id orgId, String impersonateUser, Boolean isReadOnly) { return null; }

    global static String getLoginAsUrl(Id caseId, Id orgId, String impersonateUser, Boolean isReadOnly, Boolean shouldUseQkBtServletEntry) { return null; }

    global static List getOrgMetadataByInfrastructureType(String targetIds, String targetType) { return null; }

    global static String getOrganizationDetails(List orgIds) { return null; }

    global static String getPublicKeyPermission() { return null; }

    global static String getRelatedOrgsForAccounts(List accountIds) { return null; }

    global static String getScrutinyParams(String scrutinyName) { return null; }

    global static String getScrutinyParams(String scrutinyName, String orgId, String caseId) { return null; }

    global static String getSortedOrganizationDetails(List orgIds) { return null; }

    global static String getTroubleshootOrgDetail(Id caseId, Id orgId) { return null; }

    global static String getUserPermsFromSecDS(String orgId, String userEmail, String publicKeyPermission) { return null; }

    global static void handleCancelAll(String actionId) { }

    global static void handleCancelByInstance(String actionId, String instanceName, Boolean isActionOffPeak) { }

    global static void handleCancelByOrg(String actionId, String instanceName, String orgId, Boolean isActionOffPeak) { }

    global static void handleContinueExecution(String actionId, Integer batchNumber, Boolean isOffPeak) { }

    global static Boolean hasSecDSPerm(String secDSPermName, String userEmailId) { return false; }

    global static Boolean hasSecDSPerm(String secDSPermName, String userEmailId, String orgId) { return false; }

    global virtual Integer hashCode() { return 0; }

    global static String insertSuccessfulAuditableActionResultForApexTest(String caseId, String requestType) { return null; }

    global static Integer isFixerRunnable(String scrutinyName, String orgId, String caseId, String userEmailId, String publicKeyPermission) { return 0; }

    global static Integer isFixerRunnable(String scrutinyName, String orgId, String caseId, String userEmailId, Boolean offPeakOverride, String publicKeyPermission) { return 0; }

    global static Boolean isLegacyOrgPermEnabled(String orgId, String orgPermString) { return false; }

    global static Boolean isLicenseEditorGaterEnabled() { return false; }

    global static Boolean isSecDSEnabled() { return false; }

    global static String makeChatterPostAsBTFAUser(String body) { return null; }

    global static String retrieveScrutinyResults(String runId, String orgId, String caseId) { return null; }

    global override virtual String toString() { return null; }
}