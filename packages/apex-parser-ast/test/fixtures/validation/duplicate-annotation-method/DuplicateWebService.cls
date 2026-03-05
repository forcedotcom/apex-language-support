public class DuplicateWebService {
    @WebService
    public static String method1(String param1) {
        return 'test';
    }
    
    @WebService
    public static String method1(Integer param2) {
        return 'duplicate'; // Duplicate: same name (WebService doesn't allow any duplicates, even with different param types)
    }
}
