public class UpsertWithFieldSpec {
    public void validUpsert() {
        List<Account> accounts = new List<Account>();
        upsert accounts ExternalId__c;  // Valid: concrete type with field spec
    }
}
