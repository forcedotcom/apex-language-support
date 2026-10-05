global abstract class FlowProvisionBase implements Database.AllowsCallouts, Database.Batchable, Database.Stateful {
    global FlowProvisionBase(String uprId) { }

    global virtual Boolean equals(Object o) { return false; }

    global String getFlowName() { return null; }

    global String getFlowNamespace() { return null; }

    global Boolean hasFlow() { return false; }

    global Boolean hasFlowOrApex() { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}