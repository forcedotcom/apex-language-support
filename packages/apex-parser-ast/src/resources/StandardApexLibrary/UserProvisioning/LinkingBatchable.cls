global class LinkingBatchable extends UserProvisioning.FlowProvisionBase implements Database.AllowsCallouts, Database.Batchable, Database.Stateful {
    global LinkingBatchable(String uprId) { }

    global virtual Boolean equals(Object o) { return false; }

    global void execute(Database.BatchableContext BC, List scope) { }

    global void finish(Database.BatchableContext BC) { }

    global String getFlowName() { return null; }

    global String getFlowNamespace() { return null; }

    global Boolean hasFlow() { return false; }

    global Boolean hasFlowOrApex() { return false; }

    global virtual Integer hashCode() { return 0; }

    global Database.QueryLocator start(Database.BatchableContext BC) { return null; }

    global override virtual String toString() { return null; }
}