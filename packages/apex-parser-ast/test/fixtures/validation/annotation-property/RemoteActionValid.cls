public class RemoteActionValid {
    @RemoteAction
    public static String method1() {
        return 'test';
    }

    @RemoteAction(callout=true)
    public static String method2() {
        return 'test';
    }
}
