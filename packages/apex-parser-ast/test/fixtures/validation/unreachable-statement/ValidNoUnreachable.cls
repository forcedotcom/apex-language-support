public class ValidNoUnreachable {
    public void testMethod() {
        Integer x = 5;
        if (x > 0) {
            System.debug('Positive');
        } else {
            System.debug('Negative');
        }
        return;
    }
    
    public Integer getValue() {
        return 42;
    }
}
