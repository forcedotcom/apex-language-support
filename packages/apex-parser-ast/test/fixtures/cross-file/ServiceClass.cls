public class ServiceClass {
    public static String processData(String input) {
        if (input == null) {
            return 'No data provided';
        }
        
        // Process the input data
        String processed = input.toUpperCase();
        processed = processed.trim();
        
        return 'Processed: ' + processed;
    }
    
    public static List<String> splitString(String input, String delimiter) {
        if (input == null || delimiter == null) {
            return new List<String>();
        }
        
        return input.split(delimiter);
    }
    
    public static Map<String, Object> createDataMap(String key, Object value) {
        Map<String, Object> dataMap = new Map<String, Object>();
        dataMap.put(key, value);
        return dataMap;
    }
}
