public class DuplicateRemoteAction {
    @RemoteAction
    public static String method1(String param1) {
        return 'test';
    }
    
    @RemoteAction
    public static String method1(Integer param2) {
        return 'duplicate'; // Different param type to ensure both methods are collected
    }
    
    @RemoteAction
    public static String method1(Integer param3) {
        return 'duplicate2'; // Duplicate: same name and same parameter count (Integer)
    }
}
