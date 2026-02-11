public class ReadOnlyValid {
    @ReadOnly
    public static String method1() {
        return 'test';
    }

    @ReadOnly(useReplica='never')
    public static String method2() {
        return 'test';
    }

    @ReadOnly(useReplica='preferred')
    public static String method3() {
        return 'test';
    }
}
