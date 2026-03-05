public class UpsertInvalidFieldSpec {
    public void invalidUpsert() {
        List<SObject> sobjList = new List<SObject>();
        upsert sobjList SomeField__c;  // UPSERT_REQUIRES_CONCRETE_TYPE
    }
}
