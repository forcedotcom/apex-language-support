global with sharing class UnitOfWork {
    global UnitOfWork() { }

    global void commitWork() { }

    global Database.DeleteResult deleteRecord(SObject sobj) { return null; }

    global List deleteRecords(List sObjects) { return null; }

    global void discardWork() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global Database.SaveResult insertRecord(SObject sobj) { return null; }

    global List insertRecords(List sObjects) { return null; }

    global override virtual String toString() { return null; }

    global Database.SaveResult updateRecord(SObject sobj) { return null; }

    global List updateRecords(List sObjects) { return null; }

    global Database.UpsertResult upsertRecord(SObject sobj) { return null; }

    global List upsertRecords(List sObjects) { return null; }
}