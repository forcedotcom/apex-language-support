global abstract class PluginBatchable extends UserProvisioning.FlowProvisionBase implements Database.AllowsCallouts, Database.Batchable, Database.Stateful {
    global Object PluginBatchable(List newRows) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global void execute(Database.BatchableContext BC, List scope) { }

    global abstract Map flowInputPreprocessing(Map myMap);

    global abstract void flowPostProcessing(UserProvisioning.ProvisioningProcessHandlerOutput provOutput, SObject thisUPR);

    global abstract String getEventPrefix();

    global String getFlowName() { return null; }

    global String getFlowNamespace() { return null; }

    global List getPerBatchUPL() { return null; }

    global List getPerBatchUPR() { return null; }

    global Map getUprToNewUplMap() { return null; }

    global Boolean hasFlow() { return false; }

    global Boolean hasFlowOrApex() { return false; }

    global virtual Integer hashCode() { return 0; }

    global abstract void postBatchProcessing();

    global Database.QueryLocator start(Database.BatchableContext BC) { return null; }

    global override virtual String toString() { return null; }
}