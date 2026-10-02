global class RequestingBatchable implements Database.AllowsCallouts, Database.Batchable, Database.Stateful {
    global Object RequestingBatchable(List newRows) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global void execute(Database.BatchableContext BC, List scope) { }

    global void finish(Database.BatchableContext BC) { }

    global virtual Integer hashCode() { return 0; }

    global Database.QueryLocator start(Database.BatchableContext BC) { return null; }

    global override virtual String toString() { return null; }
}