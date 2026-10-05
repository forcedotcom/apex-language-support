/**
 * The methods and properties in this class are for internal use only.
 */
global class FlowPerformanceSetupDetails {
    @AuraEnabled
    global String appName;
    @AuraEnabled
    global String cdpEnablementStatus;
    @AuraEnabled
    global String dataSpaceApiName;
    @AuraEnabled
    global String flowSourceObjects;
    @AuraEnabled
    global Boolean hasExistingApps;
    @AuraEnabled
    global Boolean orgHasDataSpaceEnabled;
    @AuraEnabled
    global String templateSourceId;

    global FlowPerformanceSetupDetails() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}