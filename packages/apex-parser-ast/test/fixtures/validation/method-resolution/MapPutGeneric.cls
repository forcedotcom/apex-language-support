/**
 * Tests generic type parameter resolution for Map.put() calls.
 * Map<String, Integer>.put(key, value) should validate that key is String and value is Integer.
 */
public class MapPutGeneric {
    public void testValidPut() {
        Map<String, Integer> myMap = new Map<String, Integer>();
        String key = 'test';
        Integer value = 42;
        myMap.put(key, value); // Should pass: key is String, value is Integer
    }

    public void testMapStringObjectPut() {
        Map<String, Object> myMap = new Map<String, Object>();
        String key = 'name';
        String value = 'John';
        myMap.put(key, value); // Should pass: key is String, value is Object-compatible
    }

    public void testMapIdSObjectPut() {
        Map<Id, Account> myMap = new Map<Id, Account>();
        Id accountId = '001000000000000AAA';
        Account acc = new Account();
        myMap.put(accountId, acc); // Should pass: accountId is Id, acc is Account
    }
}
