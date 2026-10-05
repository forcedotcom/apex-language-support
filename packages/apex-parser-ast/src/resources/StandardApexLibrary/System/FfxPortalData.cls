global class FfxPortalData {
    global FfxPortalData() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getCachedValue(String instanceName, String pageName, Map parameters) { return null; }

    global String getData(String instanceName, String pageName, Map parameters) { return null; }

    global String getFfxStatsInJson(String uri, Long timeoutMilli, Integer retryCount, List instanceNames, Boolean includeDR) { return null; }

    global String getFfxStatsInJsonFromSpecificServers(String uri, Long timeoutMilli, Integer retryCount, List serverList) { return null; }

    global List getFileForceDynamicConfigs(String instanceName) { return null; }

    global Map getFileForceEntities() { return null; }

    global List getFileForceServers() { return null; }

    global String getSoapResponsesInJson(String remoteClassName, String jsonOption, Long timeoutMilli, List instanceNames) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}