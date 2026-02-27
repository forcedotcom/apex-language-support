public class SafeNavAddErrorInvalid {
    public void test(Account acc) {
        acc?.Name?.addError('invalid');
    }
}
