public class ValidUniqueMethods {
    @RemoteAction
    public static String remoteMethod1(String param) {
        return 'test1';
    }
    
    @RemoteAction
    public static String remoteMethod2(String param) {
        return 'test2';
    }
    
    @WebService
    public static String webMethod1(String param) {
        return 'web1';
    }
    
    @WebService
    public static String webMethod2(String param) {
        return 'web2';
    }
}
