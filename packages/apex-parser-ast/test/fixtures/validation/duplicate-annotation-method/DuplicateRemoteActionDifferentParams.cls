public class DuplicateRemoteActionDifferentParams {
    @RemoteAction
    public static String method1(String param) {
        return 'test';
    }
    
    @RemoteAction
    public static String method1(String param1, String param2) {
        return 'different'; // Valid: same name but different parameter count
    }
}
