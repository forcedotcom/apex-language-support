public class ParameterTypeTestClass {
    // Builtin Type Parameter Resolution Tests
    public String foo(String aString, FileUtilities utils) {
        return aString.toUpperCase();
    }
    
    public Integer calculate(Integer value, String label) {
        return value * 2;
    }
    
    public Boolean validate(Boolean flag, String message) {
        return flag && message != null;
    }
    
    public List<String> process(List<String> items, Integer count) {
        List<String> result = new List<String>();
        for (Integer i = 0; i < count && i < items.size(); i++) {
            result.add(items[i].toUpperCase());
        }
        return result;
    }
    
    public Map<String, Object> transform(Map<String, Object> data) {
        Map<String, Object> result = new Map<String, Object>();
        for (String key : data.keySet()) {
            result.put(key.toUpperCase(), data.get(key));
        }
        return result;
    }
    
    // Custom Class Parameter Type Resolution Tests
    public String processWithService(String input, ServiceClass service) {
        return service.processData(input);
    }
    
    public String formatWithUtility(String input, UtilityClass utils) {
        return utils.formatString(input);
    }
    
    public void updateAccount(Account acc, String name) {
        acc.Name = name;
        acc.updateBillingAddress('123 Main St', 'Anytown', 'CA', '12345', 'USA');
    }
    
    // Generic Type Parameter Resolution Tests
    public List<String> filter(List<String> items, String pattern) {
        List<String> result = new List<String>();
        for (String item : items) {
            if (item.contains(pattern)) {
                result.add(item);
            }
        }
        return result;
    }
    
    public Map<String, Object> createDataMap(String key, Object value) {
        Map<String, Object> result = new Map<String, Object>();
        result.put(key, value);
        return result;
    }
    
    public Set<String> unique(Set<String> items) {
        Set<String> result = new Set<String>();
        for (String item : items) {
            result.add(item.toLowerCase());
        }
        return result;
    }
    
    // Complex Parameter Type Resolution Tests
    public List<String> flatten(List<List<String>> nested) {
        List<String> result = new List<String>();
        for (List<String> inner : nested) {
            result.addAll(inner);
        }
        return result;
    }
    
    public Map<String, List<Account>> processAccounts(
        List<Account> accounts,
        Map<String, Boolean> flags,
        Set<Integer> ids,
        FileUtilities utils
    ) {
        Map<String, List<Account>> result = new Map<String, List<Account>>();
        // Implementation details...
        return result;
    }
    
    // Return Type Tests
    public String getStringValue() {
        return 'test';
    }
    
    public Integer getIntegerValue() {
        return 42;
    }
    
    public List<String> getStringList() {
        return new List<String>{'a', 'b', 'c'};
    }
    
    public Map<String, Object> getDataMap() {
        return new Map<String, Object>{'key' => 'value'};
    }
}
