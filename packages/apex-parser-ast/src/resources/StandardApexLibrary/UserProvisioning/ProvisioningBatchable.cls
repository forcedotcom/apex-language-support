global class ProvisioningBatchable extends UserProvisioning.PluginBatchable implements Database.AllowsCallouts, Database.Batchable, Database.Stateful {
    global Object ProvisioningBatchable(List newRows) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global void execute(Database.BatchableContext BC, List scope) { }

    global void finish(Database.BatchableContext BC) { }

    global override Map flowInputPreprocessing(Map myMap) { return null; }

    global override void flowPostProcessing(UserProvisioning.ProvisioningProcessHandlerOutput provOutput, SObject thisUPR) { }

    global override String getEventPrefix() { return null; }

    global String getFlowName() { return null; }

    global String getFlowNamespace() { return null; }

    global List getPerBatchUPL() { return null; }

    global List getPerBatchUPR() { return null; }

    global Map getUprToNewUplMap() { return null; }

    global Boolean hasFlow() { return false; }

    global Boolean hasFlowOrApex() { return false; }

    global virtual Integer hashCode() { return 0; }

    global override void postBatchProcessing() { }

    global Database.QueryLocator start(Database.BatchableContext BC) { return null; }

    global override virtual String toString() { return null; }
}