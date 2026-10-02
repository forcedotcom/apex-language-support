global class GusOps {
    global Object GusOps() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global static String executeCustomSqlScript(Id caseId) { return null; }

    global static String executeCustomSqlScript(Id caseId, Set implPlanIds) { return null; }

    global static String executeCustomSqlScriptFromValidInstances(Id caseId, Set validInstances) { return null; }

    global static String executeDbScript(Id caseId, Set instances, Set validInstances, Set invalidInstances) { return null; }

    global static String executeUsingInternalRestServiceWithCase(String httpMethod, String targetOrgId, String url, String caseId, String body) { return null; }

    global static String generateExecutionResultsUrl(String requestId) { return null; }

    global static String generateExecutionResultsUrl(String requestId, String caseId, String actionName, String targetId) { return null; }

    global static String generateMultiOrgToken(Id caseId, List orgIds) { return null; }

    global static String generateSfdcAuditableActionResultReaderUrl(String requestId) { return null; }

    global static String getBtActionUrl(String caseId, String actionName, String targetIds, String verificationIds, String operationId, String argumentName, String argumentValue) { return null; }

    global static String getBtRollbackUrl(String caseId, String originalActionName, String uniqueRunId, String targetIds) { return null; }

    global static void getInstancesFromCase(Id caseId, Set implPlanIds, Set validInstances, Set invalidInstances) { }

    global static String getOrganizationInstanceName(String orgId) { return null; }

    global static String getSqlScriptOutputUrl(Id caseId, String instanceName) { return null; }

    global static String getSqlScriptOutputUrl(Id caseId, String instanceName, String orgId) { return null; }

    global virtual Integer hashCode() { return 0; }

    global static String insertFailedAuditableActionResultForApexTest(Id caseId, String requestType) { return null; }

    global static String insertSuccessfulAuditableActionResultForApexTest(Id caseId, String requestType) { return null; }

    global override virtual String toString() { return null; }

    global static void validateSqlScriptCase(Id caseId) { }

    global static void validateSqlScriptCase(Id caseId, Set instances) { }
}