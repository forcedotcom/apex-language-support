public class DuplicateWebServiceDifferentParams {
    @WebService
    public static String method1(String param) {
        return 'test';
    }
    
    @WebService
    public static String method1(String param1, String param2) {
        return 'duplicate'; // Duplicate: same name (WebService doesn't allow any duplicates, even with different params)
    }
}
