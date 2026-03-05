public class MergeInvalidTypes {
    public void invalidMerge() {
        SObject sobj = null;
        List<SObject> dupList = new List<SObject>();
        merge sobj dupList;  // MERGE_REQUIRES_CONCRETE_TYPE for master

        Account acc = new Account();
        List<Contact> contacts = new List<Contact>();
        merge acc contacts;  // INVALID_MERGE_DUPLICATE_RECORDS - type mismatch
    }
}
