public class ReadOnlyInvalid {
    @ReadOnly(useReplica='invalid')
    public static String method1() {
        return 'test';
    }
}
